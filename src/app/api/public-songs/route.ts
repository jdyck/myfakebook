import { fetchQuery } from "convex/nextjs";

import { api } from "../../../../convex/_generated/api";

const responseHeaders = { "Cache-Control": "private, no-store" };

import { getCatalogCountry, getConvexSiteUrl } from "@/lib/songs/catalog-server";

export async function GET(request: Request) {
  const accessKey = process.env.PUBLIC_CATALOG_ACCESS_KEY;
  const convexSiteUrl = getConvexSiteUrl();

  if (accessKey && convexSiteUrl) {
    try {
      const response = await fetch(`${convexSiteUrl}/public-songs`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          country: getCatalogCountry(request),
        }),
        cache: "no-store",
      });

      if (response.ok) {
        return Response.json(await response.json(), { headers: responseHeaders });
      }
    } catch {
      // The worldwide catalog remains available if the regional endpoint is not configured.
    }
  }

  try {
    const songs = await fetchQuery(api.songs.listPublicSongs, {});
    return Response.json({ songs }, { headers: responseHeaders });
  } catch {
    return Response.json({ error: "Public songs are unavailable" }, { status: 503, headers: responseHeaders });
  }
}
