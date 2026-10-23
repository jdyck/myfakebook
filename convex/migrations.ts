import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const BATCH_SIZE = 100;
type Phase = "binders" | "items";
type BatchResult = {
  phase: Phase;
  copied: number;
  skipped: number;
  done: boolean;
};

// Run with legacy writes paused. Each page and its continuation commit together.
// Existing copies are never overwritten, so restarting safely resumes the copy.
export const copySetListsToBinders = internalMutation({
  args: {
    phase: v.optional(v.union(v.literal("binders"), v.literal("items"))),
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args): Promise<BatchResult> => {
    const phase = args.phase ?? "binders";
    const pagination = { cursor: args.cursor ?? null, numItems: BATCH_SIZE };
    let copied = 0;
    let skipped = 0;
    let isDone: boolean;
    let continueCursor: string;

    if (phase === "binders") {
      const result = await ctx.db.query("setLists").paginate(pagination);
      for (const source of result.page) {
        const existing = await ctx.db.query("binders")
          .withIndex("by_legacySetListId", (q) => q.eq("legacySetListId", source._id))
          .unique();
        if (existing) {
          skipped += 1;
          continue;
        }
        await ctx.db.insert("binders", {
          ownerId: source.ownerId,
          name: source.name,
          updatedAt: source.updatedAt,
          legacySetListId: source._id,
        });
        copied += 1;
      }
      ({ isDone, continueCursor } = result);
    } else {
      const result = await ctx.db.query("setListItems").paginate(pagination);
      for (const source of result.page) {
        const existing = await ctx.db.query("binderItems")
          .withIndex("by_legacySetListItemId", (q) => q.eq("legacySetListItemId", source._id))
          .unique();
        if (existing) {
          skipped += 1;
          continue;
        }
        const binder = await ctx.db.query("binders")
          .withIndex("by_legacySetListId", (q) => q.eq("legacySetListId", source.setListId))
          .unique();
        if (!binder) throw new Error(`Missing migrated binder for ${source.setListId}; restart from the binders phase`);
        await ctx.db.insert("binderItems", {
          ownerId: source.ownerId,
          binderId: binder._id,
          songId: source.songId,
          position: source.position,
          ...(source.displaySettings === undefined ? {} : { displaySettings: source.displaySettings }),
          legacySetListItemId: source._id,
        });
        copied += 1;
      }
      ({ isDone, continueCursor } = result);
    }

    const done = phase === "items" && isDone;
    if (!done) {
      await ctx.scheduler.runAfter(0, internal.migrations.copySetListsToBinders, {
        phase: isDone ? "items" : phase,
        cursor: isDone ? null : continueCursor,
      });
    }
    const result = { phase, copied, skipped, done };
    console.info("Binder migration", result);
    return result;
  },
});
