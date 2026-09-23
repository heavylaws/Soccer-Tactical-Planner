// CoachTactics Authoritative Drill REST API Router
import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import {
  defaultDrillService,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  DrillService,
} from './drillService.ts';

function sendDrillError(res: Response, err: unknown, fallback: string) {
  if (err instanceof NotFoundError) {
    return res.status(404).json({ success: false, error: err.message });
  }
  if (err instanceof ForbiddenError) {
    return res.status(403).json({ success: false, error: err.message });
  }
  if (err instanceof ValidationError) {
    return res.status(422).json({ success: false, error: err.message, details: err.details });
  }
  console.error('[drills]', fallback, err);
  return res.status(500).json({ success: false, error: fallback });
}

export function createDrillRouter(service: DrillService = defaultDrillService): Router {
  const router = Router();

  // All drill operations require an authenticated server identity
  router.use(requireAuth);

  // GET /api/drills — drills visible to the current user
  router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const drills = await service.getDrillsForUser(req.user!);
      res.json({ success: true, count: drills.length, drills });
    } catch (err) {
      sendDrillError(res, err, 'Failed to retrieve drills');
    }
  });

  // GET /api/drills/:id
  router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const drill = await service.getDrillById(req.params.id, req.user!);
      res.json({ success: true, drill });
    } catch (err) {
      sendDrillError(res, err, 'Failed to retrieve drill');
    }
  });

  // POST /api/drills
  router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const created = await service.createDrill(req.body, req.user!);
      res.status(201).json({ success: true, drill: created });
    } catch (err) {
      sendDrillError(res, err, 'Failed to create drill');
    }
  });

  // PATCH and PUT /api/drills/:id
  const update = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await service.updateDrill(req.params.id, req.body, req.user!);
      res.json({ success: true, drill: updated });
    } catch (err) {
      sendDrillError(res, err, 'Failed to update drill');
    }
  };
  router.patch('/:id', update);
  router.put('/:id', update);

  // DELETE /api/drills/:id
  router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      await service.deleteDrill(req.params.id, req.user!);
      res.json({ success: true, message: 'Drill deleted successfully' });
    } catch (err) {
      sendDrillError(res, err, 'Failed to delete drill');
    }
  });

  // POST /api/drills/migrate — import legacy localStorage drills
  router.post('/migrate', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rawDrills = req.body?.drills ?? req.body;
      const result = await service.migrateLegacyDrills(rawDrills, req.user!);
      res.json({ success: true, imported: result.imported, failed: result.failed, drills: result.drills });
    } catch (err) {
      sendDrillError(res, err, 'Failed to migrate drills');
    }
  });

  return router;
}

export const drillRouter = createDrillRouter();
