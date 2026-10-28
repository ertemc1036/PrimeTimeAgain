/**
 * Step-by-step log of the 3D pipeline (GL context → renderer → shaders → assets → frames), so a
 * failure on a phone shows the real error instead of only a generic message.
 */
export type DiagStatus = 'ok' | 'fail' | 'info';

export interface DiagEntry {
  step: string;
  status: DiagStatus;
  detail?: string;
  /** Milliseconds since the log started. */
  at: number;
}

export interface DiagLog {
  entries: DiagEntry[];
  ok(step: string, detail?: string): void;
  info(step: string, detail?: string): void;
  fail(step: string, error: unknown): void;
  /** Run fn as a named step: logs ok with its duration, or the error (and rethrows it). */
  step<T>(step: string, fn: () => T): T;
  stepAsync<T>(step: string, fn: () => Promise<T>): Promise<T>;
  subscribe(fn: () => void): () => void;
  text(): string;
}

/** Message plus the first lines of the stack, without leaking anything else. */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    const stack = (error.stack ?? '').split('\n').slice(1, 5).map((l) => l.trim()).join('\n');
    return `${error.name}: ${error.message}${stack ? `\n${stack}` : ''}`;
  }
  return typeof error === 'string' ? error : JSON.stringify(error);
}

export function createDiagLog(): DiagLog {
  const started = Date.now();
  const entries: DiagEntry[] = [];
  const listeners = new Set<() => void>();
  const push = (e: Omit<DiagEntry, 'at'>) => {
    entries.push({ ...e, at: Date.now() - started });
    if (__DEV__) {
      const line = `[3d] ${e.status.toUpperCase()} ${e.step}${e.detail ? ` — ${e.detail}` : ''}`;
      if (e.status === 'fail') console.warn(line);
      else console.log(line);
    }
    listeners.forEach((l) => l());
  };
  const log: DiagLog = {
    entries,
    ok: (step, detail) => push({ step, status: 'ok', detail }),
    info: (step, detail) => push({ step, status: 'info', detail }),
    fail: (step, error) => push({ step, status: 'fail', detail: describeError(error) }),
    step(step, fn) {
      const t = Date.now();
      try {
        const r = fn();
        log.ok(step, `${Date.now() - t} ms`);
        return r;
      } catch (e) {
        log.fail(step, e);
        throw e;
      }
    },
    async stepAsync(step, fn) {
      const t = Date.now();
      try {
        const r = await fn();
        log.ok(step, `${Date.now() - t} ms`);
        return r;
      } catch (e) {
        log.fail(step, e);
        throw e;
      }
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
    text: () => entries.map((e) => `${String(e.at).padStart(6)}ms ${e.status.toUpperCase().padEnd(4)} ${e.step}${e.detail ? `\n         ${e.detail.replace(/\n/g, '\n         ')}` : ''}`).join('\n'),
  };
  return log;
}
