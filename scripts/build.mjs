// CoachTactics — cross-platform production build (Windows, macOS, Linux, Docker).
// 1. Remove dist/  2. Vite client build → dist/client/  3. esbuild server bundle → dist/server.cjs
// The server bundle forces NODE_ENV=production at startup, so `node dist/server.cjs` needs no env
// prefix and Express (loaded from node_modules, not bundled) also runs in production mode.
import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as viteBuild } from 'vite';
import { build as esbuild } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

async function main() {
  rmSync(dist, { recursive: true, force: true });

  // Uses vite.config.ts (outDir: dist/client).
  await viteBuild({ root, mode: 'production', logLevel: 'info' });

  await esbuild({
    entryPoints: [path.join(root, 'server.ts')],
    outfile: path.join(dist, 'server.cjs'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    sourcemap: true,
    // The bundle is production-only: bundled code sees NODE_ENV=production regardless of the shell.
    define: { 'process.env.NODE_ENV': '"production"' },
    // External packages (Express etc.) read NODE_ENV at runtime; set it before any require().
    banner: { js: 'process.env.NODE_ENV = "production";' },
    logLevel: 'info',
  });
}

main().catch((err) => {
  console.error('[build] Failed:', err);
  process.exit(1);
});
