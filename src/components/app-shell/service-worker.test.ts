import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const workerSource = readFileSync("public/sw.js", "utf8");

function createWorker() {
  const listeners = new Map<string, (event: unknown) => void>();
  const offline = new Response("Offline screen");
  const cache = { add: vi.fn().mockResolvedValue(undefined), match: vi.fn().mockResolvedValue(offline) };
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    keys: vi.fn().mockResolvedValue(["myfakebook-offline-v0", "myfakebook-offline-v1", "myfakebook-offline-v2", "other-app"]),
    delete: vi.fn().mockResolvedValue(true),
  };
  const worker = {
    addEventListener: (name: string, listener: (event: unknown) => void) => listeners.set(name, listener),
    location: { origin: "https://myfakebook.test" },
    skipWaiting: vi.fn().mockResolvedValue(undefined),
    clients: { claim: vi.fn().mockResolvedValue(undefined) },
  };
  const fetch = vi.fn();
  // Node's Request requires absolute URLs, unlike the browser's constructor.
  class WorkerRequest extends Request {
    constructor(url: string, init?: RequestInit) {
      super(new URL(url, worker.location.origin), init);
    }
  }
  runInNewContext(workerSource, { self: worker, caches, fetch, URL, Request: WorkerRequest, Response });

  async function lifecycle(name: string) {
    let completion: Promise<unknown> | undefined;
    listeners.get(name)!({ waitUntil: (promise: Promise<unknown>) => { completion = promise; } });
    await completion;
  }

  function request(overrides = {}) {
    const respondWith = vi.fn();
    listeners.get("fetch")!({
      request: { method: "GET", mode: "navigate", url: "https://myfakebook.test/mylibrary/private-song", ...overrides },
      respondWith,
    });
    return respondWith;
  }

  return { cache, caches, fetch, offline, worker, lifecycle, request };
}

describe("PWA service worker", () => {
  it("precaches only the public offline screen and removes only its own obsolete caches", async () => {
    const { cache, caches, worker, lifecycle } = createWorker();
    await lifecycle("install");
    expect(cache.add).toHaveBeenCalledTimes(1);
    const request = cache.add.mock.calls[0][0] as Request;
    expect(request.url).toBe("https://myfakebook.test/offline.html");
    expect(request.cache).toBe("reload");
    expect(worker.skipWaiting).toHaveBeenCalledOnce();
    await lifecycle("activate");
    expect(caches.delete.mock.calls).toEqual([["myfakebook-offline-v0"], ["myfakebook-offline-v1"]]);
    expect(worker.clients.claim).toHaveBeenCalledOnce();
  });

  it("returns fresh navigation responses, including server errors, without caching them", async () => {
    const { cache, caches, fetch, request } = createWorker();
    for (const status of [200, 401, 500]) {
      const response = new Response("Network page", { status });
      fetch.mockResolvedValueOnce(response);
      expect(await request().mock.calls[0][0]).toBe(response);
    }
    expect(caches.open).not.toHaveBeenCalled();
    expect(cache.add).not.toHaveBeenCalled();
  });

  it("uses the offline screen only when a navigation fails", async () => {
    const { cache, fetch, offline, request } = createWorker();
    fetch.mockRejectedValue(new TypeError("Offline"));
    expect(await request().mock.calls[0][0]).toBe(offline);
    expect(cache.match).toHaveBeenCalledWith("/offline.html");
    cache.match.mockResolvedValueOnce(undefined);
    expect((await request().mock.calls[0][0] as Response).type).toBe("error");
  });

  it("leaves API calls, Next.js payloads, assets, mutations, and external requests alone", () => {
    const { fetch, request } = createWorker();
    for (const overrides of [
      { mode: "cors", url: "https://myfakebook.test/api/public-songs" },
      { mode: "cors", url: "https://myfakebook.test/mylibrary?_rsc=123" },
      { mode: "no-cors", url: "https://myfakebook.test/_next/static/app.js" },
      { method: "POST" },
      { url: "https://auth.example.com/sign-in" },
    ]) {
      expect(request(overrides)).not.toHaveBeenCalled();
    }
    expect(fetch).not.toHaveBeenCalled();
  });
});
