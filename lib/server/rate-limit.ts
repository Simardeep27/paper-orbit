export interface Clock {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
}

export const systemClock: Clock = {
  now: () => Date.now(),
  sleep: (ms: number) =>
    new Promise((resolve) => {
      setTimeout(resolve, Math.max(0, ms));
    }),
};

/**
 * Single-process upstream scheduler. Concurrency is one, and request starts
 * are separated by at least minIntervalMs. Sharing this instance across
 * search and graph routes keeps the local process within an introductory
 * API-key budget. It does not coordinate multiple server instances.
 */
export class UpstreamScheduler {
  private tail: Promise<void> = Promise.resolve();
  private lastStart = Number.NEGATIVE_INFINITY;
  private readonly minIntervalMs: number;
  private readonly clock: Clock;

  constructor(minIntervalMs: number, clock: Clock = systemClock) {
    this.minIntervalMs = Math.max(0, minIntervalMs);
    this.clock = clock;
  }

  schedule<T>(task: () => Promise<T>): Promise<T> {
    const run = this.tail.then(async () => {
      const elapsed = this.clock.now() - this.lastStart;
      const wait = this.minIntervalMs - elapsed;
      if (wait > 0) await this.clock.sleep(wait);
      this.lastStart = this.clock.now();
      return task();
    });
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}

/** Coalesces identical in-flight operations; failures are not retained. */
export class InFlightCoalescer {
  private readonly inFlight = new Map<string, Promise<unknown>>();

  run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing) return existing as Promise<T>;
    const promise = task().finally(() => {
      if (this.inFlight.get(key) === promise) {
        this.inFlight.delete(key);
      }
    });
    this.inFlight.set(key, promise);
    return promise;
  }

  get size(): number {
    return this.inFlight.size;
  }
}

type GlobalWithScheduler = typeof globalThis & {
  __paperOrbitScheduler?: UpstreamScheduler;
  __paperOrbitCoalescer?: InFlightCoalescer;
};

export function getSharedScheduler(minIntervalMs: number): UpstreamScheduler {
  const globalStore = globalThis as GlobalWithScheduler;
  if (!globalStore.__paperOrbitScheduler) {
    globalStore.__paperOrbitScheduler = new UpstreamScheduler(minIntervalMs);
  }
  return globalStore.__paperOrbitScheduler;
}

export function getSharedCoalescer(): InFlightCoalescer {
  const globalStore = globalThis as GlobalWithScheduler;
  if (!globalStore.__paperOrbitCoalescer) {
    globalStore.__paperOrbitCoalescer = new InFlightCoalescer();
  }
  return globalStore.__paperOrbitCoalescer;
}

export function resetSchedulerForTests() {
  const globalStore = globalThis as GlobalWithScheduler;
  globalStore.__paperOrbitScheduler = undefined;
  globalStore.__paperOrbitCoalescer = undefined;
}

/**
 * Parses Retry-After as delta-seconds or an HTTP date. Returns null when the
 * header is absent or malformed.
 */
export function parseRetryAfterSeconds(
  value: string | null,
  nowMs = Date.now(),
): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    return Math.max(0, Number.parseInt(trimmed, 10));
  }
  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) return null;
  return Math.max(0, Math.ceil((date - nowMs) / 1000));
}

export function retryBackoffMs(attempt: number): number {
  return Math.min(2000, 400 * 2 ** Math.max(0, attempt));
}
