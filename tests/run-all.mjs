// Runs every tests/*.test.ts file in its own process (suites keep module-level state and call process.exit).
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith('.test.ts')).sort();
const failed = [];

for (const file of files) {
  console.log(`\n=== ${file} ===`);
  const result = spawnSync(process.execPath, ['--import', 'tsx', path.join(dir, file)], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test', STORAGE_DRIVER: 'memory' },
  });
  if (result.status !== 0) failed.push(file);
}

console.log(`\n${files.length - failed.length}/${files.length} test files passed.`);
if (failed.length) {
  console.error(`Failed: ${failed.join(', ')}`);
  process.exit(1);
}
