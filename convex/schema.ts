import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { songDisplaySettingsValidator } from "./validators";

export default defineSchema({
  songs: defineTable({
    ownerId: v.string(),
    title: v.string(),
    writers: v.string(),
    rhythm: v.string(),
    abc: v.string(),
    publicationState: v.union(v.literal("private"), v.literal("published")),
    updatedAt: v.number(),
    publishedAt: v.optional(v.number()),
    catalogId: v.optional(v.string()),
  })
    .index("by_owner_updatedAt", ["ownerId", "updatedAt"])
    .index("by_publication_updatedAt", ["publicationState", "updatedAt"])
    .index("by_catalogId", ["catalogId"]),

  setLists: defineTable({
    ownerId: v.string(),
    name: v.string(),
    updatedAt: v.number(),
  }).index("by_owner_updatedAt", ["ownerId", "updatedAt"]),

  setListItems: defineTable({
    ownerId: v.string(),
    setListId: v.id("setLists"),
    songId: v.id("songs"),
    position: v.number(),
    displaySettings: v.optional(songDisplaySettingsValidator),
  })
    .index("by_setList_position", ["setListId", "position"])
    .index("by_song", ["songId"]),

  catalogImports: defineTable({
    libraryId: v.string(),
    importedAt: v.number(),
  }).index("by_libraryId", ["libraryId"]),
});
