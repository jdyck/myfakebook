import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { listPrivateSongs, removePrivateSong, savePrivateSong } from "./songStore";

async function currentOwner(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.subject;
}

const compatiblePrivateSongId = v.union(v.id("privateSongs"), v.id("scores"));

async function withLegacyScoreErrors<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Error && error.message === "Private song not found") {
      throw new Error("Score not found");
    }
    throw error;
  }
}

// Compatibility API. Keep this path while existing clients may still call api.scores.*.
export const listMine = query({
  args: {},
  handler: async (ctx) => listPrivateSongs(ctx, await currentOwner(ctx), "legacy"),
});

export const save = mutation({
  args: {
    id: v.optional(compatiblePrivateSongId),
    title: v.string(),
    abc: v.string(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) =>
    withLegacyScoreErrors(async () => {
      const ownerId = await currentOwner(ctx);
      const title = args.title.trim() || "Untitled lead sheet";
      const { legacyId } = await savePrivateSong(
        ctx,
        ownerId,
        { title, abc: args.abc, updatedAt: args.updatedAt },
        args.id,
      );
      return legacyId;
    }),
});

export const remove = mutation({
  args: { id: compatiblePrivateSongId },
  handler: async (ctx, args) =>
    withLegacyScoreErrors(async () => removePrivateSong(ctx, args.id, await currentOwner(ctx))),
});
