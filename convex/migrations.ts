import { Migrations } from "@convex-dev/migrations";
import { v } from "convex/values";

import { components, internal } from "./_generated/api";
import schema from "./schema";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";

type SongAuditPage = {
  processed: number;
  missingCanonical: number;
  duplicateCanonical: number;
  mismatchedCanonical: number;
  done: boolean;
  cursor: string;
};

export const migrations = new Migrations(components.migrations, {
  internalMutation,
  schema,
});

export const copyPrivateSongs = migrations.define({
  table: "scores",
  migrateOne: async (ctx, score) => {
    const existing = await ctx.db
      .query("privateSongs")
      .withIndex("by_legacyScoreId", (query) => query.eq("legacyScoreId", score._id))
      .first();
    const values = {
      ownerId: score.ownerId,
      title: score.title,
      abc: score.abc,
      updatedAt: score.updatedAt,
      legacyScoreId: score._id,
    };

    if (existing) {
      await ctx.db.patch("privateSongs", existing._id, values);
    } else {
      await ctx.db.insert("privateSongs", values);
    }
  },
});

export const copyPublicSongs = migrations.define({
  table: "catalogCharts",
  migrateOne: async (ctx, song) => {
    const existing = await ctx.db
      .query("publicSongs")
      .withIndex("by_legacyCatalogChartId", (query) => query.eq("legacyCatalogChartId", song._id))
      .first();
    const values = {
      title: song.title,
      writers: song.writers,
      rhythm: song.rhythm,
      abc: song.abc,
      status: song.status,
      createdBy: song.createdBy,
      updatedAt: song.updatedAt,
      publishedAt: song.publishedAt,
      legacyCatalogChartId: song._id,
    };

    if (existing) {
      await ctx.db.patch("publicSongs", existing._id, values);
    } else {
      await ctx.db.insert("publicSongs", values);
    }
  },
});

export const auditPrivateSongsPage = internalQuery({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("scores").order("asc").paginate({ numItems: 100, cursor: args.cursor });
    let missingCanonical = 0;
    let duplicateCanonical = 0;
    let mismatchedCanonical = 0;

    for (const legacy of page.page) {
      const matches = await ctx.db
        .query("privateSongs")
        .withIndex("by_legacyScoreId", (query) => query.eq("legacyScoreId", legacy._id))
        .collect();
      if (matches.length === 0) {
        missingCanonical++;
      } else if (matches.length > 1) {
        duplicateCanonical++;
      }
      const canonical = matches[0];
      if (canonical && (
        canonical.ownerId !== legacy.ownerId ||
        canonical.title !== legacy.title ||
        canonical.abc !== legacy.abc ||
        canonical.updatedAt !== legacy.updatedAt
      )) {
        mismatchedCanonical++;
      }
    }

    return {
      processed: page.page.length,
      missingCanonical,
      duplicateCanonical,
      mismatchedCanonical,
      done: page.isDone,
      cursor: page.continueCursor,
    };
  },
});

export const auditPublicSongsPage = internalQuery({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("catalogCharts").order("asc").paginate({ numItems: 100, cursor: args.cursor });
    let missingCanonical = 0;
    let duplicateCanonical = 0;
    let mismatchedCanonical = 0;

    for (const legacy of page.page) {
      const matches = await ctx.db
        .query("publicSongs")
        .withIndex("by_legacyCatalogChartId", (query) => query.eq("legacyCatalogChartId", legacy._id))
        .collect();
      if (matches.length === 0) {
        missingCanonical++;
      } else if (matches.length > 1) {
        duplicateCanonical++;
      }
      const canonical = matches[0];
      if (canonical && (
        canonical.title !== legacy.title ||
        canonical.writers !== legacy.writers ||
        canonical.rhythm !== legacy.rhythm ||
        canonical.abc !== legacy.abc ||
        canonical.status !== legacy.status ||
        canonical.createdBy !== legacy.createdBy ||
        canonical.updatedAt !== legacy.updatedAt ||
        canonical.publishedAt !== legacy.publishedAt
      )) {
        mismatchedCanonical++;
      }
    }

    return {
      processed: page.page.length,
      missingCanonical,
      duplicateCanonical,
      mismatchedCanonical,
      done: page.isDone,
      cursor: page.continueCursor,
    };
  },
});

export const auditSongLibraries = internalAction({
  args: {},
  handler: async (ctx) => {
    const privateAudit = { processed: 0, missingCanonical: 0, duplicateCanonical: 0, mismatchedCanonical: 0 };
    let privateCursor: string | null = null;
    let privateDone = false;
    while (!privateDone) {
      const page: SongAuditPage = await ctx.runQuery(internal.migrations.auditPrivateSongsPage, {
        cursor: privateCursor,
      });
      privateAudit.processed += page.processed;
      privateAudit.missingCanonical += page.missingCanonical;
      privateAudit.duplicateCanonical += page.duplicateCanonical;
      privateAudit.mismatchedCanonical += page.mismatchedCanonical;
      privateCursor = page.cursor;
      privateDone = page.done;
    }

    const publicAudit = { processed: 0, missingCanonical: 0, duplicateCanonical: 0, mismatchedCanonical: 0 };
    let publicCursor: string | null = null;
    let publicDone = false;
    while (!publicDone) {
      const page: SongAuditPage = await ctx.runQuery(internal.migrations.auditPublicSongsPage, {
        cursor: publicCursor,
      });
      publicAudit.processed += page.processed;
      publicAudit.missingCanonical += page.missingCanonical;
      publicAudit.duplicateCanonical += page.duplicateCanonical;
      publicAudit.mismatchedCanonical += page.mismatchedCanonical;
      publicCursor = page.cursor;
      publicDone = page.done;
    }

    return { privateSongs: privateAudit, publicSongs: publicAudit };
  },
});

export const runPrivateSongs = migrations.runner(internal.migrations.copyPrivateSongs);
export const runPublicSongs = migrations.runner(internal.migrations.copyPublicSongs);
export const runAll = migrations.runner([
  internal.migrations.copyPrivateSongs,
  internal.migrations.copyPublicSongs,
]);
