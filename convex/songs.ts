import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./auth";
import { listMine, listPublished, removeSong, saveSong, setPublicationState } from "./songStore";

async function currentOwner(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.subject;
}

export const listMySongs = query({
  args: {},
  handler: async (ctx) => listMine(ctx, await currentOwner(ctx)),
});

export const listPublicSongs = query({
  args: {},
  handler: async (ctx) => {
    const [songs, legacySongs] = await Promise.all([
      listPublished(ctx),
      ctx.db
        .query("publicSongs")
        .withIndex("by_status", (query) => query.eq("status", "published"))
        .collect(),
    ]);
    return [
      ...songs.map((song) => ({
        id: song._id,
        ...(song.legacyPublicId || song.catalogId
          ? { legacyId: song.legacyPublicId ?? song.catalogId }
          : {}),
        isLegacy: false,
        title: song.title,
        writers: song.writers,
        rhythm: song.rhythm,
        abc: song.abc,
        updatedAt: song.updatedAt,
      })),
      ...legacySongs.map((song) => ({
        id: song._id,
        isLegacy: true,
        title: song.title,
        writers: song.writers,
        rhythm: song.rhythm,
        abc: song.abc,
        updatedAt: song.updatedAt,
      })),
    ].sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const save = mutation({
  args: {
    id: v.optional(v.id("songs")),
    title: v.string(),
    abc: v.string(),
    writers: v.optional(v.string()),
    rhythm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const isAdmin = (identity.metadata as { role?: string } | undefined)?.role === "admin";
    return saveSong(ctx, identity.subject, {
      title: args.title.trim() || "Untitled lead sheet",
      abc: args.abc,
      writers: args.writers,
      rhythm: args.rhythm,
    }, args.id, isAdmin);
  },
});

export const publish = mutation({
  args: { id: v.id("songs") },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    return setPublicationState(ctx, args.id, identity.subject, "published");
  },
});

export const unpublish = mutation({
  args: { id: v.id("songs") },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    return setPublicationState(ctx, args.id, identity.subject, "private");
  },
});

export const remove = mutation({
  args: { id: v.id("songs") },
  handler: async (ctx, args) => removeSong(ctx, args.id, await currentOwner(ctx)),
});

export const migrateMine = mutation({
  args: {},
  handler: async (ctx) => {
    const ownerId = await currentOwner(ctx);
    const publicSongs = await ctx.db
      .query("publicSongs")
      .withIndex("by_createdBy", (query) => query.eq("createdBy", ownerId))
      .take(25);

    // Move public records first so a matching private record can become the same song.
    if (publicSongs.length > 0) {
      for (const publicSong of publicSongs) {
        const matches = await ctx.db
          .query("privateSongs")
          .withIndex("by_owner", (query) => query.eq("ownerId", ownerId))
          .filter((query) => query.and(
            query.eq(query.field("title"), publicSong.title),
            query.eq(query.field("abc"), publicSong.abc),
          ))
          .take(2);
        const privateSong = matches.length === 1 ? matches[0] : undefined;
        await ctx.db.insert("songs", {
          ownerId,
          title: publicSong.title,
          writers: publicSong.writers,
          rhythm: publicSong.rhythm,
          abc: publicSong.abc,
          publicationState: publicSong.status === "published" ? "published" : "private",
          updatedAt: Math.max(publicSong.updatedAt, privateSong?.updatedAt ?? 0),
          publishedAt: publicSong.status === "published" ? publicSong.publishedAt : undefined,
          legacyPrivateId: privateSong?._id,
          legacyPublicId: publicSong._id,
        });
        await ctx.db.delete("publicSongs", publicSong._id);
        if (privateSong) await ctx.db.delete("privateSongs", privateSong._id);
      }
      return { migrated: publicSongs.length, hasMore: true };
    }

    const privateSongs = await ctx.db
      .query("privateSongs")
      .withIndex("by_owner", (query) => query.eq("ownerId", ownerId))
      .take(50);
    for (const privateSong of privateSongs) {
      await ctx.db.insert("songs", {
        ownerId,
        title: privateSong.title,
        writers: "",
        rhythm: "",
        abc: privateSong.abc,
        publicationState: "private",
        updatedAt: privateSong.updatedAt,
        legacyPrivateId: privateSong._id,
      });
      await ctx.db.delete("privateSongs", privateSong._id);
    }
    return { migrated: privateSongs.length, hasMore: privateSongs.length === 50 };
  },
});

// The hardcoded public library was already visible to everyone. Import it once
// as published song records so future visibility changes go through publish.
export const ensureCatalogSongs = mutation({
  args: {
    songs: v.array(v.object({
      id: v.string(),
      title: v.string(),
      writers: v.string(),
      rhythm: v.string(),
      abc: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    const libraryId = "built-in-v1";
    const importRecord = await ctx.db
      .query("catalogImports")
      .withIndex("by_libraryId", (query) => query.eq("libraryId", libraryId))
      .first();
    if (importRecord) return { imported: 0 };

    let imported = 0;

    for (const catalogSong of args.songs) {
      const alreadyImported = await ctx.db
        .query("songs")
        .withIndex("by_catalogId", (query) => query.eq("catalogId", catalogSong.id))
        .first();
      if (alreadyImported) continue;

      const matchingMigratedSong = await ctx.db
        .query("songs")
        .withIndex("by_owner_updatedAt", (query) => query.eq("ownerId", identity.subject))
        .filter((query) => query.and(
          query.eq(query.field("title"), catalogSong.title),
          query.eq(query.field("abc"), catalogSong.abc),
        ))
        .collect()
        .then((matches) => matches.find((song) => song.legacyPublicId));

      const now = Date.now();
      if (matchingMigratedSong) {
        await ctx.db.patch("songs", matchingMigratedSong._id, {
          writers: catalogSong.writers,
          rhythm: catalogSong.rhythm,
          publicationState: "published",
          publishedAt: matchingMigratedSong.publishedAt ?? now,
          catalogId: catalogSong.id,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("songs", {
          ownerId: identity.subject,
          title: catalogSong.title,
          writers: catalogSong.writers,
          rhythm: catalogSong.rhythm,
          abc: catalogSong.abc,
          publicationState: "published",
          publishedAt: now,
          catalogId: catalogSong.id,
          updatedAt: now,
        });
      }
      imported += 1;
    }

    await ctx.db.insert("catalogImports", { libraryId, importedAt: Date.now() });
    return { imported };
  },
});
