// CoachTactics — Express entry point (dev: Vite middleware; prod: static client from dist/client).
import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { config, IS_PROD, IS_TEST } from './server/config.ts';
import { authRouter } from './server/routes/authRoutes.ts';
import { userRouter } from './server/routes/userRoutes.ts';
import { drillRouter } from './server/drills/drillRoutes.ts';
import {
  requireAuth,
  requireRole,
  requireSuperAdmin,
  WRITER_ROLES,
  AuthenticatedRequest,
} from './server/middleware/authMiddleware.ts';
import { validateTacticalDrill } from './server/tactical/tacticalValidator.ts';
import { synthesizeTacticalDrill } from './server/tactical/tacticalSynthesizer.ts';
import { applyFastChange, isFastChangeType, FAST_CHANGE_TYPES } from './server/tactical/fastChanges.ts';
import { CACHE_VERSION, TacticalGenerationContext } from './server/cache/cacheFingerprint.ts';
import {
  drillCache,
  cacheMetrics,
  saveToDrillCache,
  findInDrillCache,
  prewarmCache,
  resetCacheMetrics,
} from './server/cache/drillCacheStore.ts';
import { generateDrillWithGemini } from './server/ai/geminiDrillGenerator.ts';
import { securityHeaders } from './server/security/httpHardening.ts';
import { FixedWindowLimiter } from './server/security/rateLimit.ts';

// Re-exported for the existing cache test suite.
export { drillCache, cacheMetrics, saveToDrillCache, findInDrillCache, prewarmCache };
export type { CachedDrillEntry } from './server/cache/drillCacheStore.ts';

export const APP_VERSION = '2.1.0';

const MAX_PROMPT_LENGTH = 1000;

function optionalText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  return v ? v.slice(0, max) : undefined;
}

// Gemini calls cost money; cache hits and eco mode do not count against this limit.
const geminiLimiter = new FixedWindowLimiter(10 * 60 * 1000, config.generateLimitPerWindow);
const fastChangeLimiter = new FixedWindowLimiter(60 * 1000, 60);

export interface CreateAppOptions {
  /** Serve the React client (Vite in dev, dist/client in prod). Tests pass false. */
  withFrontend?: boolean;
}

export async function createApp(options: CreateAppOptions = {}) {
  const { withFrontend = true } = options;
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  prewarmCache();

  app.use(securityHeaders({ isProd: IS_PROD, frameAncestors: config.frameAncestors }));
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  app.use('/api/auth', authRouter);
  app.use('/api/users', userRouter);
  app.use('/api/drills', drillRouter);

  // Public liveness probe: deliberately reveals nothing about configuration.
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', version: APP_VERSION });
  });

  app.get('/api/cache-stats', requireAuth, (_req, res) => {
    const hitRate =
      cacheMetrics.totalRequests > 0 ? Math.round((cacheMetrics.cacheHits / cacheMetrics.totalRequests) * 100) : 100;
    res.json({
      totalRequests: cacheMetrics.totalRequests,
      cacheHits: cacheMetrics.cacheHits,
      apiCalls: cacheMetrics.apiCalls,
      quotaSaved: cacheMetrics.quotaSaved,
      fallbacks: cacheMetrics.fallbacks,
      hitRatePercent: hitRate,
      cachedDrillsCount: drillCache.size,
      cacheVersion: CACHE_VERSION,
      geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY || config.geminiApiKey),
      geminiModels: config.geminiModels,
    });
  });

  app.post('/api/clear-cache', requireAuth, requireSuperAdmin, (_req, res) => {
    prewarmCache();
    resetCacheMetrics();
    res.json({
      success: true,
      message: 'Generation cache cleared and re-seeded.',
      cachedDrillsCount: drillCache.size,
      cacheVersion: CACHE_VERSION,
    });
  });

  app.post(
    '/api/generate-drill',
    requireAuth,
    requireRole(...WRITER_ROLES),
    async (req: AuthenticatedRequest, res: Response) => {
      const body = req.body || {};
      const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
      if (!prompt) {
        return res.status(400).json({ success: false, error: 'Describe the drill you want to generate.' });
      }
      if (prompt.length > MAX_PROMPT_LENGTH) {
        return res
          .status(400)
          .json({ success: false, error: `Keep the drill description under ${MAX_PROMPT_LENGTH} characters.` });
      }

      const formation = optionalText(body.currentFormation, 40);
      const focusArea = optionalText(body.focusArea, 80);
      const pitchView: 'FULL' | 'HALF' = body.pitchView === 'HALF' ? 'HALF' : 'FULL';
      const forceRefresh = body.forceRefresh === true;
      const ecoMode = body.ecoMode === true;

      const genContext: TacticalGenerationContext = { prompt, formation, focusArea, pitchView, ecoMode };
      cacheMetrics.totalRequests++;

      // 1. Exact-match cache
      if (!forceRefresh) {
        const cached = findInDrillCache(genContext);
        if (cached) {
          cached.hits++;
          cacheMetrics.cacheHits++;
          cacheMetrics.quotaSaved++;
          const isFallback = cached.source === 'coachtactics-fallback';
          return res.json({
            success: true,
            drill: { ...cached.drill, id: `drill_cached_${Date.now()}`, isCached: true, cacheSource: 'server-memory', quotaSaved: true },
            cached: true,
            cacheEntrySource: cached.source,
            isTacticalFallback: isFallback,
            cacheHits: cached.hits,
            quotaSaved: true,
            fingerprint: cached.fingerprint,
          });
        }
      }

      // 2. Eco mode: deterministic offline engine, zero API cost
      if (ecoMode) {
        const valResult = validateTacticalDrill(synthesizeTacticalDrill(prompt, formation, focusArea, pitchView));
        if (!valResult.success || !valResult.drill) {
          console.error('[generate] Eco drill failed validation:', valResult.errors);
          return res.status(500).json({ success: false, error: 'The offline tactical engine produced an invalid drill.' });
        }
        cacheMetrics.cacheHits++;
        cacheMetrics.quotaSaved++;
        const fingerprint = saveToDrillCache(genContext, valResult.drill, 'coachtactics-synthesized');
        return res.json({
          success: true,
          drill: { ...valResult.drill, id: `drill_eco_${Date.now()}`, isCached: true, cacheSource: 'coachtactics-offline', quotaSaved: true },
          cached: true,
          quotaSaved: true,
          ecoMode: true,
          fingerprint,
        });
      }

      // 3. Gemini (rate limited per user)
      const limit = geminiLimiter.hit(`gen:${req.user!.id}`);
      if (!limit.allowed) {
        res.setHeader('Retry-After', String(limit.retryAfterSec));
        return res.status(429).json({
          success: false,
          error: `AI generation limit reached. Try again in ${Math.ceil(limit.retryAfterSec / 60)} minute(s), or switch on eco mode.`,
          retryAfterSec: limit.retryAfterSec,
        });
      }

      const outcome = await generateDrillWithGemini({ prompt, formation, focusArea, pitchView });
      if (outcome.ok) {
        cacheMetrics.apiCalls++;
        saveToDrillCache(genContext, outcome.drill, 'gemini-cached');
        return res.json({
          success: true,
          drill: { ...outcome.drill, id: `drill_ai_${Date.now()}`, isCached: false, cacheSource: 'gemini-fresh', quotaSaved: false },
          cached: false,
          quotaSaved: false,
          isTacticalFallback: false,
          modelUsed: outcome.model,
        });
      }

      if (outcome.reason === 'NO_API_KEY') {
        console.warn('[generate] GEMINI_API_KEY is not configured; using the offline tactical engine.');
      } else {
        console.warn('[generate] All Gemini models failed:', JSON.stringify(outcome.attempts));
      }

      // 4. Offline fallback. Cached briefly (10 min) so an outage doesn't burn quota,
      //    but Gemini is retried once the entry expires.
      const fallback = validateTacticalDrill(synthesizeTacticalDrill(prompt, formation, focusArea, pitchView));
      if (!fallback.success || !fallback.drill) {
        console.error('[generate] Fallback drill failed validation:', fallback.errors);
        return res.status(500).json({ success: false, error: 'Drill generation failed. Please try again.' });
      }
      cacheMetrics.fallbacks++;
      cacheMetrics.quotaSaved++;
      saveToDrillCache(genContext, fallback.drill, 'coachtactics-fallback');
      return res.json({
        success: true,
        drill: { ...fallback.drill, id: `drill_synth_${Date.now()}`, isCached: true, cacheSource: 'coachtactics-offline', quotaSaved: true },
        cached: false,
        quotaSaved: true,
        isTacticalFallback: true,
        fallbackReason: outcome.reason === 'NO_API_KEY' ? 'NO_API_KEY' : 'AI_UNAVAILABLE',
      });
    }
  );

  app.post(
    '/api/fast-change',
    requireAuth,
    requireRole(...WRITER_ROLES),
    (req: AuthenticatedRequest, res: Response) => {
      const limit = fastChangeLimiter.hit(`fast:${req.user!.id}`);
      if (!limit.allowed) {
        return res.status(429).json({ success: false, error: 'Too many adjustments. Slow down.' });
      }

      const { drill, changeType } = req.body || {};
      if (!isFastChangeType(changeType)) {
        return res
          .status(400)
          .json({ success: false, error: `Unknown adjustment. Expected one of: ${FAST_CHANGE_TYPES.join(', ')}.` });
      }

      const input = validateTacticalDrill(drill);
      if (!input.success || !input.drill) {
        return res.status(422).json({ success: false, error: 'The active drill is not valid.', details: input.errors });
      }

      const result = applyFastChange(input.drill, changeType);
      const output = validateTacticalDrill(result.drill);
      if (!output.success || !output.drill) {
        return res
          .status(422)
          .json({ success: false, error: 'The adjusted drill failed validation.', details: output.errors });
      }

      return res.json({ success: true, drill: output.drill, changed: result.changed, message: result.message });
    }
  );

  // Unknown API routes return JSON, never the SPA shell.
  app.use('/api', (_req, res) => {
    res.status(404).json({ success: false, error: 'Not found.' });
  });

  if (withFrontend) {
    if (!IS_PROD) {
      const { createServer: createViteServer } = await import('vite');
      const isHmrDisabled = process.env.DISABLE_HMR === 'true';
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: isHmrDisabled ? false : undefined,
          watch: isHmrDisabled ? null : undefined,
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      // Only the client build is public. dist/server.cjs(.map) lives one level up and is never served.
      const clientDir = path.join(process.cwd(), 'dist', 'client');
      app.use(express.static(clientDir, { index: false, maxAge: '1h' }));
      app.get('*', (_req, res) => {
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(path.join(clientDir, 'index.html'));
      });
    }
  }

  // Last-resort error handler: JSON, no stack traces.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ success: false, error: 'Request body is not valid JSON.' });
    }
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({ success: false, error: 'Request body is too large.' });
    }
    console.error('[server] Unhandled error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  });

  return app;
}

async function startServer() {
  const app = await createApp({ withFrontend: true });
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`CoachTactics ${APP_VERSION} listening on http://localhost:${config.port} (${IS_PROD ? 'production' : 'development'})`);
    console.log(`[config] storage=${config.storageDriver} dataDir=${config.dataDir} trustProxy=${String(config.trustProxy)}`);
  });
}

if (!IS_TEST) {
  startServer().catch((err) => {
    console.error('Failed to start CoachTactics server:', err);
    process.exit(1);
  });
}
