import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./auth";

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("catalogCharts")
      .withIndex("by_status", (query) => query.eq("status", "published"))
      .order("desc")
      .collect();
  },
});

export const listForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    return ctx.db.query("catalogCharts").order("desc").collect();
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

    const now = Date.now();

    return ctx.db.insert("catalogCharts", {
      title,
      writers: args.writers.trim(),
      rhythm: args.rhythm.trim(),
      abc: args.abc,
      status: "draft",
      createdBy: identity.subject,
      updatedAt: now,
    });
  },
});

export const publishFromLibrary = mutation({
  args: {
    scoreId: v.id("scores"),
    writers: v.optional(v.string()),
    rhythm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    const score = await ctx.db.get(args.scoreId);

    if (!score || score.ownerId !== identity.subject) {
      throw new Error("Song not found");
    }

    const now = Date.now();

    return ctx.db.insert("catalogCharts", {
      title: score.title,
      writers: args.writers?.trim() ?? "",
      rhythm: args.rhythm?.trim() ?? "",
      abc: score.abc,
      status: "published",
      createdBy: identity.subject,
      updatedAt: now,
      publishedAt: now,
    });
  },
});

export const publish = mutation({
  args: { id: v.id("catalogCharts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const chart = await ctx.db.get(args.id);
    if (!chart) throw new Error("Catalog chart not found");

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "published",
      publishedAt: now,
      updatedAt: now,
    });

    return args.id;
  },
});

export const unpublish = mutation({
  args: { id: v.id("catalogCharts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const chart = await ctx.db.get(args.id);
    if (!chart) throw new Error("Catalog chart not found");

    await ctx.db.patch(args.id, {
      status: "draft",
      updatedAt: Date.now(),
    });

    return args.id;
  },
});
