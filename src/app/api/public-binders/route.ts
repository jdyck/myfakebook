import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { getCatalogCountry, getConvexSiteUrl } from "@/lib/songs/catalog-server";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? undefined;
  const headers = { "Cache-Control": "private, no-store" };
  const accessKey = process.env.PUBLIC_CATALOG_ACCESS_KEY;
  const siteUrl = getConvexSiteUrl();
  if (accessKey && siteUrl) {
    try {
      const response = await fetch(`${siteUrl}/public-binders`, {
        method: "POST", cache: "no-store",
        headers: { Authorization: `Bearer ${accessKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id, country: getCatalogCountry(request) }),
      });
      if (response.ok) return Response.json(await response.json(), { headers });
    } catch { /* Fall back to worldwide access. */ }
  }
  try {
    const result = id
      ? { binder: await fetchQuery(api.binders.getPublic, { id }), binders: null }
      : { binder: null, binders: await fetchQuery(api.binders.listPublic, {} ) };
    return Response.json(result, { headers });
  } catch {
    return Response.json({ error: "Public binders are unavailable" }, { status: 503, headers });
  }
}
