import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  privateSongs: defineTable({
    ownerId: v.string(),
    title: v.string(),
    abc: v.string(),
    updatedAt: v.number(),
    // Inert historical source ID retained so migrated documents remain valid.
    legacyScoreId: v.optional(v.string()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_updatedAt", ["ownerId", "updatedAt"]),

  publicSongs: defineTable({
    title: v.string(),
    writers: v.string(),
    rhythm: v.string(),
    abc: v.string(),
    status: v.union(v.literal("draft"), v.literal("published")),
    createdBy: v.string(),
    updatedAt: v.number(),
    publishedAt: v.optional(v.number()),
    // Inert historical source ID retained so migrated documents remain valid.
    legacyCatalogChartId: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_updatedAt", ["updatedAt"]),
});
