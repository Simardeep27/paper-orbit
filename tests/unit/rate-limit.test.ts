import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  InFlightCoalescer,
  UpstreamScheduler,
  parseRetryAfterSeconds,
  retryBackoffMs,
  type Clock,
} from "@/lib/server/rate-limit";
import { LruTtlCache } from "@/lib/server/cache";
import {
  searchLive,
} from "@/lib/providers/semantic-scholar";
import { resetSchedulerForTests } from "@/lib/server/rate-limit";

class FakeClock implements Clock {
  time = 0;
  starts: number[] = [];
  now = () => this.time;
  sleep = async (ms: number) => {
    this.time += Math.max(0, ms);
  };
}

describe("upstream scheduler", () => {
  it("serializes tasks and spaces request starts by the minimum interval", async () => {
    const clock = new FakeClock();
    const scheduler = new UpstreamScheduler(1100, clock);
    const starts: number[] = [];
    const task = async () => {
      starts.push(clock.now());
      return starts.length;
    };
    const results = await Promise.all([
      scheduler.schedule(task),
      scheduler.schedule(task),
      scheduler.schedule(task),
    ]);
    expect(results).toEqual([1, 2, 3]);
    expect(starts).toEqual([0, 1100, 2200]);
  });

  it("continues scheduling after a task rejection", async () => {
    const clock = new FakeClock();
    const scheduler = new UpstreamScheduler(100, clock);
    await expect(
      scheduler.schedule(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    const value = await scheduler.schedule(async () => clock.now());
    expect(value).toBe(100);
  });
});

describe("request coalescing", () => {
  it("shares an identical in-flight operation", async () => {
    const coalescer = new InFlightCoalescer();
    let calls = 0;
    let resolve: (value: string) => void = () => undefined;
    const task = () =>
      new Promise<string>((done) => {
        calls += 1;
        resolve = done;
      });
    const first = coalescer.run("same", task);
    const second = coalescer.run("same", task);
    expect(calls).toBe(1);
    resolve("ok");
    await expect(first).resolves.toBe("ok");
    await expect(second).resolves.toBe("ok");
    expect(coalescer.size).toBe(0);
  });

  it("does not retain a failed operation", async () => {
    const coalescer = new InFlightCoalescer();
    let calls = 0;
    await expect(
      coalescer.run("key", async () => {
        calls += 1;
        throw new Error("fail");
      }),
    ).rejects.toThrow("fail");
    await expect(
      coalescer.run("key", async () => {
        calls += 1;
        return "recovered";
      }),
    ).resolves.toBe("recovered");
    expect(calls).toBe(2);
  });
});

describe("cache", () => {
  it("expires entries at the TTL boundary", () => {
    let now = 0;
    const cache = new LruTtlCache<string>({ maxEntries: 2, now: () => now });
    cache.set("a", "value", 100);
    now = 99;
    expect(cache.get("a")).toBe("value");
    now = 100;
    expect(cache.get("a")).toBeUndefined();
  });

  it("evicts the least recently used entry at the size bound", () => {
    const cache = new LruTtlCache<string>({ maxEntries: 2, now: () => 0 });
    cache.set("a", "A", 1000);
    cache.set("b", "B", 1000);
    cache.get("a");
    cache.set("c", "C", 1000);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe("A");
    expect(cache.get("c")).toBe("C");
    expect(cache.size).toBe(2);
  });
});

describe("retry headers and backoff", () => {
  it("parses delta-seconds and HTTP dates", () => {
    expect(parseRetryAfterSeconds("12")).toBe(12);
    expect(
      parseRetryAfterSeconds(
        new Date(10_000).toUTCString(),
        5_000,
      ),
    ).toBe(5);
    expect(parseRetryAfterSeconds("not-a-date")).toBeNull();
    expect(parseRetryAfterSeconds(null)).toBeNull();
  });

  it("uses bounded exponential backoff", () => {
    expect(retryBackoffMs(0)).toBe(400);
    expect(retryBackoffMs(1)).toBe(800);
    expect(retryBackoffMs(10)).toBe(2000);
  });
});

describe("Semantic Scholar request behavior", () => {
  const originalInterval = process.env.UPSTREAM_MIN_INTERVAL_MS;
  const originalTimeout = process.env.UPSTREAM_TIMEOUT_MS;

  beforeEach(() => {
    process.env.UPSTREAM_MIN_INTERVAL_MS = "0";
    process.env.UPSTREAM_TIMEOUT_MS = "1000";
    resetSchedulerForTests();
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    resetSchedulerForTests();
    process.env.UPSTREAM_MIN_INTERVAL_MS = originalInterval;
    process.env.UPSTREAM_TIMEOUT_MS = originalTimeout;
  });

  function searchPayload() {
    return {
      data: [
        {
          paperId: "abc123",
          title: "A paper",
          year: 2020,
          authors: [{ authorId: "a1", name: "Ada" }],
          venue: "Venue",
          citationCount: 3,
          referenceCount: 2,
          url: "https://example.org/paper",
          externalIds: { DOI: "10.1000/test" },
          abstract: null,
        },
      ],
      next: null,
    };
  }

  it("retries a 429 after honoring Retry-After", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("{}", {
          status: 429,
          headers: { "Retry-After": "1" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(searchPayload()), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const promise = searchLive("graph", 0, 5_000);
    await vi.advanceTimersByTimeAsync(1_500);
    const result = await promise;
    expect(result.papers).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns a typed rate-limit error when Retry-After exceeds the budget", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("{}", {
        status: 429,
        headers: { "Retry-After": "30" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(searchLive("graph", 0, 5_000)).rejects.toMatchObject({
      code: "RATE_LIMITED",
      retryable: true,
      retryAfterSeconds: 30,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry a 400 response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(searchLive("graph", 0, 5_000)).rejects.toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      retryable: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries 5xx at most twice", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    const promise = searchLive("graph", 0, 10_000);
    const assertion = expect(promise).rejects.toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      retryable: true,
    });
    await vi.advanceTimersByTimeAsync(2_000);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("reports malformed payloads without crashing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ unexpected: true }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(searchLive("graph", 0, 5_000)).rejects.toMatchObject({
      code: "INVALID_PROVIDER_RESPONSE",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("coalesces identical concurrent searches", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(searchPayload()), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const [first, second] = await Promise.all([
      searchLive("graph", 0, 5_000),
      searchLive("graph", 0, 5_000),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first.papers[0].id).toBe("abc123");
    expect(second.papers[0].id).toBe("abc123");
  });
});
