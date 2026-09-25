import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";

async function currentOwner(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.subject;
}

async function ownedSetList(
  ctx: MutationCtx,
  id: Id<"setLists">,
  ownerId: string,
) {
  const setList = await ctx.db.get("setLists", id);
  if (!setList || setList.ownerId !== ownerId) throw new Error("Set list not found");
  return setList;
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await currentOwner(ctx);
    const setLists = await ctx.db
      .query("setLists")
      .withIndex("by_owner_updatedAt", (index) => index.eq("ownerId", ownerId))
      .order("desc")
      .collect();

    return Promise.all(setLists.map(async (setList) => {
      const items = await ctx.db
        .query("setListItems")
        .withIndex("by_setList_position", (index) => index.eq("setListId", setList._id))
        .collect();
      return {
        ...setList,
        itemCount: items.length,
        songIds: items.map((item) => item.songId),
      };
    }));
  },
});

export const listAvailableSongs = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await currentOwner(ctx);
    const [ownedSongs, publishedSongs, legacyPublicSongs] = await Promise.all([
      ctx.db
        .query("songs")
        .withIndex("by_owner_updatedAt", (index) => index.eq("ownerId", ownerId))
        .order("desc")
        .collect(),
      ctx.db
        .query("songs")
        .withIndex("by_publication_updatedAt", (index) => index.eq("publicationState", "published"))
        .order("desc")
        .collect(),
      ctx.db
        .query("publicSongs")
        .withIndex("by_status", (index) => index.eq("status", "published"))
        .collect(),
    ]);

    const available = new Map<string, {
      songId: Id<"songs"> | Id<"publicSongs">;
      sourceType: "song" | "legacyPublicSong";
      title: string;
      isPublic: boolean;
      updatedAt: number;
    }>();

    for (const song of ownedSongs) {
      available.set(song._id, {
        songId: song._id,
        sourceType: "song",
        title: song.title,
        isPublic: song.publicationState === "published",
        updatedAt: song.updatedAt,
      });
    }
    for (const song of publishedSongs) {
      available.set(song._id, {
        songId: song._id,
        sourceType: "song",
        title: song.title,
        isPublic: true,
        updatedAt: song.updatedAt,
      });
    }
    const linkedPublishedLegacyIds = new Set(
      publishedSongs.flatMap((song) => song.legacyPublicId ? [song.legacyPublicId] : []),
    );
    for (const song of legacyPublicSongs) {
      if (linkedPublishedLegacyIds.has(song._id)) continue;
      available.set(`legacy:${song._id}`, {
        songId: song._id,
        sourceType: "legacyPublicSong",
        title: song.title,
        isPublic: true,
        updatedAt: song.updatedAt,
      });
    }

    return Array.from(available.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const get = query({
  args: { id: v.id("setLists") },
  handler: async (ctx, args) => {
    const ownerId = await currentOwner(ctx);
    const setList = await ctx.db.get("setLists", args.id);
    if (!setList || setList.ownerId !== ownerId) return null;

    const items = await ctx.db
      .query("setListItems")
      .withIndex("by_setList_position", (index) => index.eq("setListId", args.id))
      .order("asc")
      .collect();
    const songs = await Promise.all(items.map((item) => ctx.db.get("songs", item.songId)));

    return {
      ...setList,
      items: items.map((item, index) => {
        const song = songs[index];
        const canOpen = Boolean(song && (song.ownerId === ownerId || song.publicationState === "published"));
        return {
          _id: item._id,
          songId: item.songId,
          title: canOpen && song ? song.title : "Song no longer public",
          canOpen,
          isOwned: song?.ownerId === ownerId,
          abc: canOpen && song ? song.abc : null,
          position: item.position,
          displaySettings: item.displaySettings,
        };
      }),
    };
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await currentOwner(ctx);
    const name = args.name.trim();
    if (!name) throw new Error("Enter a set list name");
    if (name.length > 80) throw new Error("Set list names must be 80 characters or fewer");
    return ctx.db.insert("setLists", { ownerId, name, updatedAt: Date.now() });
  },
});

export const rename = mutation({
  args: { id: v.id("setLists"), name: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await currentOwner(ctx);
    const setList = await ownedSetList(ctx, args.id, ownerId);
    const name = args.name.trim();
    if (!name) throw new Error("Enter a set list name");
    if (name.length > 80) throw new Error("Set list names must be 80 characters or fewer");
    await ctx.db.patch("setLists", setList._id, { name, updatedAt: Date.now() });
    return setList._id;
  },
});

export const remove = mutation({
  args: { id: v.id("setLists") },
  handler: async (ctx, args) => {
    const ownerId = await currentOwner(ctx);
    const setList = await ownedSetList(ctx, args.id, ownerId);
    const items = await ctx.db
      .query("setListItems")
      .withIndex("by_setList_position", (index) => index.eq("setListId", args.id))
      .collect();
    for (const item of items) await ctx.db.delete("setListItems", item._id);
    await ctx.db.delete("setLists", setList._id);
    return setList._id;
  },
});

export const addSong = mutation({
  args: {
    setListId: v.id("setLists"),
    songId: v.union(v.id("songs"), v.id("publicSongs")),
    sourceType: v.union(v.literal("song"), v.literal("legacyPublicSong")),
  },
  handler: async (ctx, args) => {
    const ownerId = await currentOwner(ctx);
    await ownedSetList(ctx, args.setListId, ownerId);

    let songId: Id<"songs">;
    if (args.sourceType === "song") {
      const song = await ctx.db.get("songs", args.songId as Id<"songs">);
      if (!song || (song.ownerId !== ownerId && song.publicationState !== "published")) {
        throw new Error("Song is not available to add");
      }
      songId = song._id;
    } else {
      const legacySong = await ctx.db.get("publicSongs", args.songId as Id<"publicSongs">);
      if (!legacySong || legacySong.status !== "published") {
        throw new Error("Song is no longer public");
      }

      const linkedSongs = await ctx.db
        .query("songs")
        .withIndex("by_legacyPublicId", (index) => index.eq("legacyPublicId", legacySong._id))
        .collect();
      const publishedSong = linkedSongs.find((linkedSong) => linkedSong.publicationState === "published");
      if (publishedSong) {
        songId = publishedSong._id;
      } else {
        const now = Date.now();
        const linkedSong = linkedSongs[0];
        if (linkedSong) {
          await ctx.db.patch("songs", linkedSong._id, {
            title: legacySong.title,
            writers: legacySong.writers,
            rhythm: legacySong.rhythm,
            abc: legacySong.abc,
            publicationState: "published",
            publishedAt: linkedSong.publishedAt ?? legacySong.publishedAt ?? now,
            updatedAt: Math.max(linkedSong.updatedAt, legacySong.updatedAt),
          });
          songId = linkedSong._id;
        } else {
          songId = await ctx.db.insert("songs", {
            ownerId: legacySong.createdBy,
            title: legacySong.title,
            writers: legacySong.writers,
            rhythm: legacySong.rhythm,
            abc: legacySong.abc,
            publicationState: "published",
            publishedAt: legacySong.publishedAt ?? now,
            updatedAt: legacySong.updatedAt,
            legacyPublicId: legacySong._id,
          });
        }
        await ctx.db.delete("publicSongs", legacySong._id);
      }
    }

    const items = await ctx.db
      .query("setListItems")
      .withIndex("by_setList_position", (index) => index.eq("setListId", args.setListId))
      .order("desc")
      .collect();
    if (items.some((item) => item.songId === songId)) {
      throw new Error("Song is already on this set list");
    }
    const now = Date.now();
    const itemId = await ctx.db.insert("setListItems", {
      ownerId,
      setListId: args.setListId,
      songId,
      position: (items[0]?.position ?? -1) + 1,
      displaySettings: { transposition: 0, showChords: true, showLyrics: true },
    });
    await ctx.db.patch("setLists", args.setListId, { updatedAt: now });
    return itemId;
  },
});

export const updateDisplaySettings = mutation({
  args: {
    setListId: v.id("setLists"),
    itemId: v.id("setListItems"),
    displaySettings: v.object({
      transposition: v.number(),
      showChords: v.boolean(),
      showLyrics: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    const ownerId = await currentOwner(ctx);
    await ownedSetList(ctx, args.setListId, ownerId);
    const item = await ctx.db.get("setListItems", args.itemId);
    if (!item || item.ownerId !== ownerId || item.setListId !== args.setListId) {
      throw new Error("Set list item not found");
    }
    if (!Number.isInteger(args.displaySettings.transposition) || args.displaySettings.transposition < -12 || args.displaySettings.transposition > 12) {
      throw new Error("Transposition must be between -12 and +12 semitones");
    }
    await ctx.db.patch("setListItems", item._id, { displaySettings: args.displaySettings });
    await ctx.db.patch("setLists", args.setListId, { updatedAt: Date.now() });
    return item._id;
  },
});

export const removeItem = mutation({
  args: { setListId: v.id("setLists"), itemId: v.id("setListItems") },
  handler: async (ctx, args) => {
    const ownerId = await currentOwner(ctx);
    await ownedSetList(ctx, args.setListId, ownerId);
    const item = await ctx.db.get("setListItems", args.itemId);
    if (!item || item.ownerId !== ownerId || item.setListId !== args.setListId) {
      throw new Error("Set list item not found");
    }
    await ctx.db.delete("setListItems", item._id);
    await ctx.db.patch("setLists", args.setListId, { updatedAt: Date.now() });
    return item._id;
  },
});

export const reorder = mutation({
  args: { setListId: v.id("setLists"), itemIds: v.array(v.id("setListItems")) },
  handler: async (ctx, args) => {
    const ownerId = await currentOwner(ctx);
    await ownedSetList(ctx, args.setListId, ownerId);
    const items = await ctx.db
      .query("setListItems")
      .withIndex("by_setList_position", (index) => index.eq("setListId", args.setListId))
      .collect();
    const itemIds = new Set(args.itemIds);
    if (itemIds.size !== items.length || args.itemIds.length !== items.length ||
      items.some((item) => item.ownerId !== ownerId || !itemIds.has(item._id))) {
      throw new Error("Set list order is out of date");
    }

    for (const [position, itemId] of args.itemIds.entries()) {
      await ctx.db.patch("setListItems", itemId, { position });
    }
    await ctx.db.patch("setLists", args.setListId, { updatedAt: Date.now() });
    return args.setListId;
  },
});
