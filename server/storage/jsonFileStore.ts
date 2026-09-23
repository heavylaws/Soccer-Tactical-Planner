// CoachTactics — zero-dependency JSON persistence.
// Atomic writes (tmp file + rename) so a crash mid-write never leaves a truncated file.
// Adequate for club-scale data (hundreds of users, thousands of drills). Swap the
// repository implementation for Postgres/SQLite when you outgrow it — routes won't change.

import fs from 'fs';
import path from 'path';

const flushers = new Set<() => void>();
let exitHooksInstalled = false;

function flushAll(): void {
  for (const flush of flushers) {
    try {
      flush();
    } catch (err) {
      console.error('[storage] Flush on shutdown failed:', err);
    }
  }
}

function installExitHooks(): void {
  if (exitHooksInstalled) return;
  exitHooksInstalled = true;
  process.once('beforeExit', flushAll);
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      flushAll();
      process.exit(0);
    });
  }
}

/** Reads a JSON file. Missing file → fallback. Corrupt file → backed up, logged, fallback. */
export function readJsonFile<T>(file: string, fallback: T): T {
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err: any) {
    if (err?.code === 'ENOENT') return fallback;
    throw err;
  }
  try {
    return JSON.parse(raw) as T;
  } catch (err: any) {
    const backup = `${file}.corrupt-${Date.now()}`;
    try {
      fs.copyFileSync(file, backup);
    } catch {
      /* best effort */
    }
    console.error(`[storage] ${file} is not valid JSON (${err?.message}). Backed up to ${backup}; starting empty.`);
    return fallback;
  }
}

/** Writes JSON atomically with owner-only permissions. */
export function writeJsonFileAtomic(file: string, data: unknown): void {
  writeTextFileAtomic(file, JSON.stringify(data, null, 2));
}

export function writeTextFileAtomic(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, content, { mode: 0o600 });
  fs.renameSync(tmp, file);
}

/**
 * Coalesces bursts of mutations (e.g. drag-save spam) into one disk write,
 * and guarantees a final flush on SIGTERM/SIGINT/beforeExit (Docker stop, Cloud Run scale-in).
 */
export class DebouncedJsonWriter {
  private timer: NodeJS.Timeout | null = null;
  private dirty = false;

  constructor(
    private readonly file: string,
    private readonly snapshot: () => unknown,
    private readonly delayMs = 250
  ) {
    installExitHooks();
    flushers.add(() => this.flush());
  }

  schedule(): void {
    this.dirty = true;
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, this.delayMs);
    this.timer.unref?.();
  }

  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.dirty) return;
    this.dirty = false;
    try {
      writeJsonFileAtomic(this.file, this.snapshot());
    } catch (err) {
      this.dirty = true; // retry on next schedule/flush
      console.error(`[storage] Failed to write ${this.file}:`, err);
    }
  }
}
