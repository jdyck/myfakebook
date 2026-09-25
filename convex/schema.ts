import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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
    legacyPrivateId: v.optional(v.id("privateSongs")),
    legacyPublicId: v.optional(v.id("publicSongs")),
  })
    .index("by_owner_updatedAt", ["ownerId", "updatedAt"])
    .index("by_publication_updatedAt", ["publicationState", "updatedAt"])
    .index("by_catalogId", ["catalogId"])
    .index("by_legacyPublicId", ["legacyPublicId"]),

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
    displaySettings: v.optional(v.object({
      transposition: v.number(),
      showChords: v.boolean(),
      showLyrics: v.boolean(),
    })),
  })
    .index("by_setList_position", ["setListId", "position"])
    .index("by_song", ["songId"]),

  // Legacy tables are read only during the transition to songs.
  privateSongs: defineTable({
    ownerId: v.string(),
    title: v.string(),
    abc: v.string(),
    updatedAt: v.number(),
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
  })
    .index("by_status", ["status"])
    .index("by_updatedAt", ["updatedAt"])
    .index("by_createdBy", ["createdBy"]),

  catalogImports: defineTable({
    libraryId: v.string(),
    importedAt: v.number(),
  }).index("by_libraryId", ["libraryId"]),
});
