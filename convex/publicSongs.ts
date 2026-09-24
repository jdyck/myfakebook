import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./auth";
import {
  createPublicSong,
  getPrivateSongPair,
  listPublicSongs,
  removePublicSong,
  updatePublicSongStatus,
} from "./songStore";

const compatiblePrivateSongId = v.union(v.id("privateSongs"), v.id("scores"));
const compatiblePublicSongId = v.union(v.id("publicSongs"), v.id("catalogCharts"));

export const listPublished = query({
  args: {},
  handler: async (ctx) => listPublicSongs(ctx, "canonical", "published"),
});

export const listForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return listPublicSongs(ctx, "canonical");
  },
});

export const createDraft = mutation({
  args: {
    title: v.string(),
    writers: v.string(),
    rhythm: v.string(),
    abc: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    const title = args.title.trim();

    if (!title) throw new Error("Title is required");
    if (!args.abc.trim()) throw new Error("ABC content is required");

    return createPublicSong(
      ctx,
      {
        title,
        writers: args.writers.trim(),
        rhythm: args.rhythm.trim(),
        abc: args.abc,
        status: "draft",
        createdBy: identity.subject,
        updatedAt: Date.now(),
      },
      "canonical",
    );
  },
});

export const publishFromPrivateLibrary = mutation({
  args: {
    privateSongId: compatiblePrivateSongId,
    writers: v.optional(v.string()),
    rhythm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    const pair = await getPrivateSongPair(ctx, args.privateSongId);
    const song = pair.canonical ?? pair.legacy;

    if (!song || song.ownerId !== identity.subject) {
      throw new Error("Private song not found");
    }

    const now = Date.now();
    return createPublicSong(
      ctx,
      {
        title: song.title,
        writers: args.writers?.trim() ?? "",
        rhythm: args.rhythm?.trim() ?? "",
        abc: song.abc,
        status: "published",
        createdBy: identity.subject,
        updatedAt: now,
        publishedAt: now,
      },
      "canonical",
    );
  },
});

export const publish = mutation({
  args: { id: compatiblePublicSongId },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return updatePublicSongStatus(ctx, args.id, "published", Date.now());
  },
});

export const unpublish = mutation({
  args: { id: compatiblePublicSongId },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return updatePublicSongStatus(ctx, args.id, "draft", Date.now());
  },
});

export const remove = mutation({
  args: { id: compatiblePublicSongId },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return removePublicSong(ctx, args.id);
  },
});
