import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  privateSongs: defineTable({
    ownerId: v.string(),
    title: v.string(),
    abc: v.string(),
    updatedAt: v.number(),
    legacyScoreId: v.optional(v.id("scores")),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_updatedAt", ["ownerId", "updatedAt"])
    .index("by_legacyScoreId", ["legacyScoreId"]),

  publicSongs: defineTable({
    title: v.string(),
    writers: v.string(),
    rhythm: v.string(),
    abc: v.string(),
    status: v.union(v.literal("draft"), v.literal("published")),
    createdBy: v.string(),
    updatedAt: v.number(),
    publishedAt: v.optional(v.number()),
    legacyCatalogChartId: v.optional(v.id("catalogCharts")),
  })
    .index("by_status", ["status"])
    .index("by_updatedAt", ["updatedAt"])
    .index("by_legacyCatalogChartId", ["legacyCatalogChartId"]),

  // Legacy tables stay available until the copy migrations finish and are verified.
  scores: defineTable({
    ownerId: v.string(),
    title: v.string(),
    abc: v.string(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_updatedAt", ["ownerId", "updatedAt"]),

  catalogCharts: defineTable({
    title: v.string(),
    writers: v.string(),
    rhythm: v.string(),
    abc: v.string(),
    status: v.union(v.literal("draft"), v.literal("published")),
    createdBy: v.string(),
    updatedAt: v.number(),
    publishedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_updatedAt", ["updatedAt"]),
});
