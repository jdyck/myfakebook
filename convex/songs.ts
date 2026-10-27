import { v } from "convex/values";

import { internalQuery, mutation, query } from "./_generated/server";
import { isAdmin, requireAdmin, requireOwner, requireUser } from "./auth";
import { listMine, listPublished, removeSong, saveSong, setPublicationState } from "./songStore";
import { songContentValidator } from "./validators";

export const listMySongs = query({
  args: {},
  handler: async (ctx) => listMine(ctx, await requireOwner(ctx)),
});

export const listPublicSongs = query({
  args: {},
  handler: async (ctx) => {
    const songs = await listPublished(ctx);
    return songs.filter((song) => (song.publicationTerritory ?? "worldwide") === "worldwide").map((song) => ({
      id: song._id,
      ...(song.catalogId
        ? { catalogId: song.catalogId }
        : {}),
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
    const songs = await listPublished(ctx);
    return songs.map((song) => ({
      id: song._id,
      ...(song.catalogId ? { catalogId: song.catalogId } : {}),
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
    const songs = await listPublished(ctx);
    return songs
      .filter((song) => {
        const territory = song.publicationTerritory ?? "worldwide";
        return territory === "worldwide" || (territory === "US" && country === "US");
      })
      .map((song) => ({
        id: song._id,
        ...(song.catalogId ? { catalogId: song.catalogId } : {}),
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
    return setPublicationState(ctx, args.id, identity.subject, "worldwide");
  },
});

export const setPublication = mutation({
  args: {
    id: v.id("songs"),
    publication: v.union(v.literal("none"), v.literal("US"), v.literal("worldwide")),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    return setPublicationState(ctx, args.id, identity.subject, args.publication);
  },
});

export const unpublish = mutation({
  args: { id: v.id("songs") },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    return setPublicationState(ctx, args.id, identity.subject, "none");
  },
});

export const remove = mutation({
  args: { id: v.id("songs") },
  handler: async (ctx, args) => removeSong(ctx, args.id, await requireOwner(ctx)),
});
