import { v } from "convex/values";

import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { isAdmin, requireAdmin, requireOwner, requireUser } from "./auth";
import { listMine, listPublicDomain, removeSong, saveSong, setPublicDomainStatus } from "./songStore";
import { canReadSong, publicDomainTerritory } from "./songAccess";
import { songContentValidator } from "./validators";

export const listMySongs = query({
  args: {},
  handler: async (ctx) => listMine(ctx, await requireOwner(ctx)),
});

export const listPublicSongs = query({
  args: {},
  handler: async (ctx) => {
    const songs = await listPublicDomain(ctx);
    return songs.filter((song) => canReadSong(song)).map((song) => ({
      id: song._id,
      ...(song.catalogId
        ? { catalogId: song.catalogId }
        : {}),
      publicDomainTerritory: publicDomainTerritory(song),
      publicationTerritory: song.publicationTerritory ?? "worldwide",
      title: song.title,
      writers: song.writers,
      rhythm: song.rhythm,
      abc: song.abc,
      abcParts: song.abcParts,
      content: song.content,
      updatedAt: song.updatedAt,
    }));
  },
});

export const listAdminPublicSongs = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const songs = await listPublicDomain(ctx);
    return songs.map((song) => ({
      id: song._id,
      ...(song.catalogId ? { catalogId: song.catalogId } : {}),
      publicDomainTerritory: publicDomainTerritory(song),
      publicationTerritory: song.publicationTerritory ?? "worldwide",
      title: song.title,
      writers: song.writers,
      rhythm: song.rhythm,
      abc: song.abc,
      abcParts: song.abcParts,
      content: song.content,
      updatedAt: song.updatedAt,
    }));
  },
});

export const listPublicSongsForCountry = internalQuery({
  args: { country: v.union(v.literal("US"), v.literal("other")) },
  handler: async (ctx, { country }) => {
    const songs = await listPublicDomain(ctx);
    return songs
      .filter((song) => canReadSong(song, undefined, country))
      .map((song) => ({
        id: song._id,
        ...(song.catalogId ? { catalogId: song.catalogId } : {}),
        publicDomainTerritory: publicDomainTerritory(song),
        publicationTerritory: song.publicationTerritory ?? "worldwide",
        title: song.title,
        writers: song.writers,
        rhythm: song.rhythm,
        abc: song.abc,
        abcParts: song.abcParts,
        content: song.content,
        updatedAt: song.updatedAt,
      }));
  },
});

export const save = mutation({
  args: {
    id: v.optional(v.id("songs")),
    title: v.string(),
    abc: v.optional(v.string()),
    abcParts: v.optional(v.string()),
    content: v.optional(songContentValidator),
    writers: v.optional(v.string()),
    rhythm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireUser(ctx);
    return saveSong(ctx, identity.subject, {
      title: args.title.trim() || "Untitled lead sheet",
      abc: args.abc,
      abcParts: args.abcParts,
      content: args.content,
      writers: args.writers,
      rhythm: args.rhythm,
    }, args.id, isAdmin(identity));
  },
});

export const publish = mutation({
  args: { id: v.id("songs") },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    return setPublicDomainStatus(ctx, args.id, identity.subject, "worldwide");
  },
});

export const setPublication = mutation({
  args: {
    id: v.id("songs"),
    publication: v.union(v.literal("none"), v.literal("US"), v.literal("worldwide")),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    return setPublicDomainStatus(ctx, args.id, identity.subject, args.publication);
  },
});

export const unpublish = mutation({
  args: { id: v.id("songs") },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    return setPublicDomainStatus(ctx, args.id, identity.subject, "none");
  },
});

export const remove = mutation({
  args: { id: v.id("songs") },
  handler: async (ctx, args) => removeSong(ctx, args.id, await requireOwner(ctx)),
});

// Safe to run repeatedly after deploying the compatibility schema.
export const migratePublicDomainStatus = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db.query("songs").paginate({ cursor, numItems: 100 });
    for (const song of page.page) {
      if (song.publicDomainTerritory === undefined) {
        await ctx.db.patch("songs", song._id, { publicDomainTerritory: publicDomainTerritory(song) });
      }
    }
    return { cursor: page.continueCursor, done: page.isDone };
  },
});

export const setPublicDomain = mutation({
  args: {
    id: v.id("songs"),
    territory: v.union(v.literal("none"), v.literal("US"), v.literal("worldwide")),
  },
  handler: async (ctx, { id, territory }) => {
    const identity = await requireAdmin(ctx);
    return setPublicDomainStatus(ctx, id, identity.subject, territory);
  },
});
