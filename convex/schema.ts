import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  scores: defineTable({
    ownerId: v.string(),
    title: v.string(),
    abc: v.string(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_updatedAt", ["ownerId", "updatedAt"]),
});
