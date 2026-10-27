import { auth } from "@clerk/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { getCatalogCountry } from "@/lib/songs/catalog-server";

const headers = { "Cache-Control": "private, no-store" };
async function access(request: Request) {
  const token = await (await auth()).getToken({ template: "convex" });
  const key = process.env.PUBLIC_CATALOG_ACCESS_KEY;
  return { token, regionalAccess: key ? { key, country: getCatalogCountry(request) } : undefined };
}
export async function GET(request: Request) {
  const { token, regionalAccess } = await access(request);
  if (!token) return Response.json({ error: "Not authenticated" }, { status: 401, headers });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Missing binder" }, { status: 400, headers });
  const [binder, availableSongs] = await Promise.all([
    fetchQuery(api.binders.get, { id, regionalAccess }, { token }),
    fetchQuery(api.binders.listAvailableSongs, { regionalAccess }, { token }),
  ]);
  return Response.json({ binder, availableSongs }, { headers });
}
export async function POST(request: Request) {
  const { token, regionalAccess } = await access(request);
  if (!token) return Response.json({ error: "Not authenticated" }, { status: 401, headers });
  try {
    const { binderId, songId } = await request.json();
    const itemId = await fetchMutation(api.binders.addSong, {
      binderId: binderId as Id<"binders">, songId: songId as Id<"songs">, regionalAccess,
    }, { token });
    return Response.json({ itemId }, { headers });
  } catch {
    return Response.json({ error: "Couldn’t add song to binder" }, { status: 400, headers });
  }
}
