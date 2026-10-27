import { afterEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ fetchQuery: vi.fn() }));
vi.mock("convex/nextjs", () => ({ fetchQuery: mocks.fetchQuery }));
import { GET } from "./route";
import { api } from "../../../../convex/_generated/api";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

test("uses server-derived country and never trusts a country in the URL", async () => {
  vi.stubEnv("PUBLIC_CATALOG_ACCESS_KEY", "server-secret");
  vi.stubEnv("CONVEX_SITE_URL", "https://example.convex.site");
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ binder: { name: "Holiday Songs", items: [] }, binders: null }));
  vi.stubGlobal("fetch", fetchMock);
  const response = await GET(new Request("https://example.com/api/public-binders?id=binder&country=US", { headers: { "x-vercel-ip-country": "CA" } }));
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ id: "binder", country: "other" });
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer server-secret");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(mocks.fetchQuery).not.toHaveBeenCalled();
});

test("trusted US headers reach the regional endpoint", async () => {
  vi.stubEnv("PUBLIC_CATALOG_ACCESS_KEY", "server-secret");
  vi.stubEnv("CONVEX_SITE_URL", "https://example.convex.site");
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ binders: [], binder: null }));
  vi.stubGlobal("fetch", fetchMock);
  await GET(new Request("https://example.com/api/public-binders", { headers: { "x-vercel-ip-country": "US" } }));
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ country: "US" });
});

test("regional outages fall back to a country-free worldwide query", async () => {
  vi.stubEnv("PUBLIC_CATALOG_ACCESS_KEY", "server-secret");
  vi.stubEnv("CONVEX_SITE_URL", "https://example.convex.site");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  mocks.fetchQuery.mockResolvedValue({ name: "Worldwide only", items: [] });
  const response = await GET(new Request("https://example.com/api/public-binders?id=binder", { headers: { "x-vercel-ip-country": "US" } }));
  expect(mocks.fetchQuery).toHaveBeenCalledWith(api.binders.getPublic, { id: "binder" });
  expect(await response.json()).toEqual({ binder: { name: "Worldwide only", items: [] }, binders: null });
});
