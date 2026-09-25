import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export type SongId = Id<"songs">;
type ReadCtx = QueryCtx | MutationCtx;

export async function listMine(ctx: ReadCtx, ownerId: string) {
  return ctx.db
    .query("songs")
    .withIndex("by_owner_updatedAt", (query) => query.eq("ownerId", ownerId))
    .order("desc")
    .collect();
}

export async function listPublished(ctx: ReadCtx) {
  return ctx.db
    .query("songs")
    .withIndex("by_publication_updatedAt", (query) => query.eq("publicationState", "published"))
    .order("desc")
    .collect();
}

export async function saveSong(
  ctx: MutationCtx,
  ownerId: string,
  data: { title: string; abc: string; writers?: string; rhythm?: string },
  requestedId?: SongId,
  canEditPublished = false,
) {
  const now = Date.now();

  if (requestedId) {
    const existing = await ctx.db.get("songs", requestedId);
    if (!existing || existing.ownerId !== ownerId) throw new Error("Song not found");
    if (existing.publicationState === "published" && !canEditPublished) throw new Error("Not authorized");
    await ctx.db.patch("songs", requestedId, {
      title: data.title,
      abc: data.abc,
      writers: data.writers?.trim() ?? existing.writers,
      rhythm: data.rhythm?.trim() ?? existing.rhythm,
      updatedAt: now,
    });
    return requestedId;
  }

  const existing = await ctx.db
    .query("songs")
    .withIndex("by_owner_updatedAt", (query) => query.eq("ownerId", ownerId))
    .filter((query) =>
      query.and(query.eq(query.field("title"), data.title), query.eq(query.field("abc"), data.abc)),
    )
    .first();

  if (existing) return existing._id;

  return ctx.db.insert("songs", {
    ownerId,
    title: data.title,
    writers: data.writers?.trim() ?? "",
    rhythm: data.rhythm?.trim() ?? "",
    abc: data.abc,
    publicationState: "private",
    updatedAt: now,
  });
}

export async function setPublicationState(
  ctx: MutationCtx,
  id: SongId,
  ownerId: string,
  state: Doc<"songs">["publicationState"],
) {
  const song = await ctx.db.get("songs", id);
  if (!song || song.ownerId !== ownerId) throw new Error("Song not found");
  if (song.publicationState === state) return id;
  if (state === "published" && !song.abc.trim()) throw new Error("ABC content is required");
  const now = Date.now();
  await ctx.db.patch("songs", id, {
    publicationState: state,
    publishedAt: state === "published" ? now : undefined,
    updatedAt: now,
  });
  return id;
}

export async function removeSong(ctx: MutationCtx, id: SongId, ownerId: string) {
  const song = await ctx.db.get("songs", id);
  if (!song || song.ownerId !== ownerId) throw new Error("Song not found");
  if (song.publicationState === "published") throw new Error("Unpublish song before removing");
  await ctx.db.delete("songs", id);
  return id;
}
