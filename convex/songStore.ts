import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export type PrivateSongId = Id<"privateSongs">;
export type PublicSongId = Id<"publicSongs">;

type ReadCtx = QueryCtx | MutationCtx;
type PrivateSongData = Pick<Doc<"privateSongs">, "ownerId" | "title" | "abc" | "updatedAt">;
type PublicSongData = Pick<
  Doc<"publicSongs">,
  "title" | "writers" | "rhythm" | "abc" | "status" | "createdBy" | "updatedAt" | "publishedAt"
>;

export async function getPrivateSong(ctx: ReadCtx, id: PrivateSongId) {
  return ctx.db.get("privateSongs", id);
}

export async function listPrivateSongs(ctx: ReadCtx, ownerId: string) {
  return ctx.db
    .query("privateSongs")
    .withIndex("by_owner_updatedAt", (query) => query.eq("ownerId", ownerId))
    .order("desc")
    .collect();
}

export async function listPublicSongs(ctx: ReadCtx, status?: "draft" | "published") {
  const songs = await (status
    ? ctx.db
        .query("publicSongs")
        .withIndex("by_status", (query) => query.eq("status", status))
        .order("desc")
        .collect()
    : ctx.db.query("publicSongs").order("desc").collect());
  return songs.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function savePrivateSong(
  ctx: MutationCtx,
  ownerId: string,
  data: Omit<PrivateSongData, "ownerId">,
  requestedId?: PrivateSongId,
) {
  const values = { ...data, ownerId };

  if (requestedId) {
    const existing = await ctx.db.get("privateSongs", requestedId);
    if (!existing || existing.ownerId !== ownerId) throw new Error("Private song not found");
    await ctx.db.patch("privateSongs", requestedId, values);
    return requestedId;
  }

  const existing = await ctx.db
    .query("privateSongs")
    .withIndex("by_owner", (query) => query.eq("ownerId", ownerId))
    .filter((query) => query.and(query.eq(query.field("title"), data.title), query.eq(query.field("abc"), data.abc)))
    .order("desc")
    .first();

  if (existing) {
    await ctx.db.patch("privateSongs", existing._id, values);
    return existing._id;
  }

  return ctx.db.insert("privateSongs", values);
}

export async function removePrivateSong(ctx: MutationCtx, id: PrivateSongId, ownerId: string) {
  const song = await ctx.db.get("privateSongs", id);
  if (!song || song.ownerId !== ownerId) throw new Error("Private song not found");
  await ctx.db.delete("privateSongs", id);
  return id;
}

export async function createPublicSong(ctx: MutationCtx, data: PublicSongData) {
  return ctx.db.insert("publicSongs", data);
}

export async function updatePublicSongStatus(
  ctx: MutationCtx,
  id: PublicSongId,
  status: "draft" | "published",
  now: number,
) {
  const song = await ctx.db.get("publicSongs", id);
  if (!song) throw new Error("Public song not found");
  const patch = status === "published" ? { status, publishedAt: now, updatedAt: now } : { status, updatedAt: now };
  await ctx.db.patch("publicSongs", id, patch);
  return id;
}

export async function removePublicSong(ctx: MutationCtx, id: PublicSongId) {
  const song = await ctx.db.get("publicSongs", id);
  if (!song) throw new Error("Public song not found");
  await ctx.db.delete("publicSongs", id);
  return id;
}
