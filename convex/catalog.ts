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

async function withLegacyCatalogErrors<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Error && error.message === "Public song not found") {
      throw new Error("Catalog chart not found");
    }
    if (error instanceof Error && error.message === "Private song not found") {
      throw new Error("Score not found");
    }
    throw error;
  }
}

// Compatibility API. Keep this path while existing clients may still call api.catalog.*.
export const listPublished = query({
  args: {},
  handler: async (ctx) => listPublicSongs(ctx, "legacy", "published"),
});

export const listForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return listPublicSongs(ctx, "legacy");
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
      "legacy",
    );
  },
});

export const publishFromLibrary = mutation({
  args: {
    scoreId: compatiblePrivateSongId,
    writers: v.optional(v.string()),
    rhythm: v.optional(v.string()),
  },
  handler: async (ctx, args) =>
    withLegacyCatalogErrors(async () => {
      const identity = await requireAdmin(ctx);
      const pair = await getPrivateSongPair(ctx, args.scoreId);
      const score = pair.canonical ?? pair.legacy;

      if (!score || score.ownerId !== identity.subject) {
        throw new Error("Private song not found");
      }

      const now = Date.now();
      return createPublicSong(
        ctx,
        {
          title: score.title,
          writers: args.writers?.trim() ?? "",
          rhythm: args.rhythm?.trim() ?? "",
          abc: score.abc,
          status: "published",
          createdBy: identity.subject,
          updatedAt: now,
          publishedAt: now,
        },
        "legacy",
      );
    }),
});

export const publish = mutation({
  args: { id: compatiblePublicSongId },
  handler: async (ctx, args) =>
    withLegacyCatalogErrors(async () => {
      await requireAdmin(ctx);
      return updatePublicSongStatus(ctx, args.id, "published", Date.now());
    }),
});

export const unpublish = mutation({
  args: { id: compatiblePublicSongId },
  handler: async (ctx, args) =>
    withLegacyCatalogErrors(async () => {
      await requireAdmin(ctx);
      return updatePublicSongStatus(ctx, args.id, "draft", Date.now());
    }),
});

export const remove = mutation({
  args: { id: compatiblePublicSongId },
  handler: async (ctx, args) =>
    withLegacyCatalogErrors(async () => {
      await requireAdmin(ctx);
      return removePublicSong(ctx, args.id);
    }),
});
