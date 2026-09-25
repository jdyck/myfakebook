import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { requireOwner } from "./auth";
import { songDisplaySettingsValidator } from "./validators";

async function ownedSetList(
  ctx: MutationCtx,
  id: Id<"setLists">,
  ownerId: string,
) {
  const setList = await ctx.db.get("setLists", id);
  if (!setList || setList.ownerId !== ownerId) throw new Error("Set list not found");
  return setList;
}

async function ownedSetListItem(
  ctx: MutationCtx,
  setListId: Id<"setLists">,
  itemId: Id<"setListItems">,
  ownerId: string,
) {
  await ownedSetList(ctx, setListId, ownerId);
  const item = await ctx.db.get("setListItems", itemId);
  if (!item || item.ownerId !== ownerId || item.setListId !== setListId) {
    throw new Error("Set list item not found");
  }
  return item;
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireOwner(ctx);
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
    const ownerId = await requireOwner(ctx);
    const [ownedSongs, publishedSongs] = await Promise.all([
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
    ]);

    const available = new Map<string, {
      songId: Id<"songs">;
      title: string;
      isPublic: boolean;
      updatedAt: number;
    }>();

    for (const song of ownedSongs) {
      available.set(song._id, {
        songId: song._id,
        title: song.title,
        isPublic: song.publicationState === "published",
        updatedAt: song.updatedAt,
      });
    }
    for (const song of publishedSongs) {
      available.set(song._id, {
        songId: song._id,
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
    const ownerId = await requireOwner(ctx);
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
    const ownerId = await requireOwner(ctx);
    const name = args.name.trim();
    if (!name) throw new Error("Enter a set list name");
    if (name.length > 80) throw new Error("Set list names must be 80 characters or fewer");
    return ctx.db.insert("setLists", { ownerId, name, updatedAt: Date.now() });
  },
});

export const rename = mutation({
  args: { id: v.id("setLists"), name: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
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
    const ownerId = await requireOwner(ctx);
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
    songId: v.id("songs"),
  },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    await ownedSetList(ctx, args.setListId, ownerId);

    const song = await ctx.db.get("songs", args.songId);
    if (!song || (song.ownerId !== ownerId && song.publicationState !== "published")) {
      throw new Error("Song is not available to add");
    }
    const songId = song._id;

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
    displaySettings: songDisplaySettingsValidator,
  },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const item = await ownedSetListItem(ctx, args.setListId, args.itemId, ownerId);
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
    const ownerId = await requireOwner(ctx);
    const item = await ownedSetListItem(ctx, args.setListId, args.itemId, ownerId);
    await ctx.db.delete("setListItems", item._id);
    await ctx.db.patch("setLists", args.setListId, { updatedAt: Date.now() });
    return item._id;
  },
});

export const reorder = mutation({
  args: { setListId: v.id("setLists"), itemIds: v.array(v.id("setListItems")) },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
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
