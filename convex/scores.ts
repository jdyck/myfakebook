import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

async function currentOwner(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.subject;
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await currentOwner(ctx);
    return ctx.db
      .query("scores")
      .withIndex("by_owner_updatedAt", (query) => query.eq("ownerId", ownerId))
      .order("desc")
      .take(8);
  },
});

export const save = mutation({
  args: {
    id: v.optional(v.id("scores")),
    title: v.string(),
    abc: v.string(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const ownerId = await currentOwner(ctx);
    const title = (args.title ?? "").trim() || "Untitled lead sheet";
    const abc = args.abc ?? "";
    const updatedAt = args.updatedAt ?? Date.now();

    if (args.id) {
      const existing = (await ctx.db.get(args.id)) as { ownerId?: string } | null;
      if (!existing || existing.ownerId !== ownerId) throw new Error("Score not found");
      await ctx.db.patch(args.id, { title, abc, updatedAt });
      return args.id;
    }

    const existing = await ctx.db
      .query("scores")
      .withIndex("by_owner", (query) => query.eq("ownerId", ownerId))
      .filter((query) => query.and(query.eq(query.field("title"), title), query.eq(query.field("abc"), abc)))
      .order("desc")
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { updatedAt });
      return existing._id;
    }

    return ctx.db.insert("scores", { ownerId, title, abc, updatedAt });
  },
});

export const remove = mutation({
  args: {
    id: v.id("scores"),
  },
  handler: async (ctx, args) => {
    const ownerId = await currentOwner(ctx);
    const existing = await ctx.db.get(args.id);

    if (!existing || existing.ownerId !== ownerId) throw new Error("Score not found");

    await ctx.db.delete(args.id);
    return args.id;
  },
});
