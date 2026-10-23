import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { songContentValidator, songDisplaySettingsValidator } from "./validators";

export default defineSchema({
  songs: defineTable({
    ownerId: v.string(),
    title: v.string(),
    writers: v.string(),
    rhythm: v.string(),
    abc: v.optional(v.string()),
    abcParts: v.optional(v.string()),
    content: v.optional(songContentValidator),
    publicationState: v.union(v.literal("private"), v.literal("published")),
    publicationTerritory: v.optional(v.union(v.literal("US"), v.literal("worldwide"))),
    updatedAt: v.number(),
    publishedAt: v.optional(v.number()),
    catalogId: v.optional(v.string()),
  })
    .index("by_owner_updatedAt", ["ownerId", "updatedAt"])
    .index("by_publication_updatedAt", ["publicationState", "updatedAt"])
    .index("by_catalogId", ["catalogId"]),

  binders: defineTable({
    ownerId: v.string(),
    name: v.string(),
    updatedAt: v.number(),
    legacySetListId: v.optional(v.id("setLists")),
  })
    .index("by_owner_updatedAt", ["ownerId", "updatedAt"])
    .index("by_legacySetListId", ["legacySetListId"]),

  binderItems: defineTable({
    ownerId: v.string(),
    binderId: v.id("binders"),
    songId: v.id("songs"),
    position: v.number(),
    displaySettings: v.optional(songDisplaySettingsValidator),
    legacySetListItemId: v.optional(v.id("setListItems")),
  })
    .index("by_binder_position", ["binderId", "position"])
    .index("by_song", ["songId"])
    .index("by_legacySetListItemId", ["legacySetListItemId"]),

  // Retained as migration sources until the binder migration is verified.
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
