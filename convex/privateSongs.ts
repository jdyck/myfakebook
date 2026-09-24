import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { listPrivateSongs, removePrivateSong, savePrivateSong } from "./songStore";

async function currentOwner(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.subject;
}

const compatiblePrivateSongId = v.union(v.id("privateSongs"), v.id("scores"));

export const listMine = query({
  args: {},
  handler: async (ctx) => listPrivateSongs(ctx, await currentOwner(ctx), "canonical"),
});

export const save = mutation({
  args: {
    id: v.optional(compatiblePrivateSongId),
    title: v.string(),
    abc: v.string(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const ownerId = await currentOwner(ctx);
    const title = args.title.trim() || "Untitled lead sheet";
    const { canonicalId } = await savePrivateSong(
      ctx,
      ownerId,
      { title, abc: args.abc, updatedAt: args.updatedAt },
      args.id,
    );
    return canonicalId;
  },
});

export const remove = mutation({
  args: { id: compatiblePrivateSongId },
  handler: async (ctx, args) => removePrivateSong(ctx, args.id, await currentOwner(ctx)),
});
