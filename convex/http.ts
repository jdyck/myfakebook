import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/public-songs",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const accessKey = process.env.PUBLIC_CATALOG_ACCESS_KEY;
    if (!accessKey || request.headers.get("authorization") !== `Bearer ${accessKey}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    let country: "US" | "other" = "other";
    try {
      const body: unknown = await request.json();
      if (typeof body !== "object" || body === null || !("country" in body)) {
        return new Response("Invalid request", { status: 400 });
      }
      country = body.country === "US" ? "US" : "other";
    } catch {
      return new Response("Invalid request", { status: 400 });
    }

    const songs = await ctx.runQuery(internal.songs.listPublicSongsForCountry, { country });
    return Response.json({ songs }, { headers: { "Cache-Control": "private, no-store" } });
  }),
});

http.route({
  path: "/public-binders",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const accessKey = process.env.PUBLIC_CATALOG_ACCESS_KEY;
    if (!accessKey || request.headers.get("authorization") !== `Bearer ${accessKey}`) {
      return new Response("Unauthorized", { status: 401 });
    }
    try {
      const body = await request.json();
      if (!body || typeof body !== "object" || (body.id !== undefined && typeof body.id !== "string")) {
        return new Response("Invalid request", { status: 400 });
      }
      const result = await ctx.runQuery(internal.binders.publicForCountry, {
        id: body.id, country: body.country === "US" ? "US" : "other",
      });
      return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
    } catch {
      return new Response("Invalid request", { status: 400 });
    }
  }),
});

export default http;
