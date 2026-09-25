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

    return Promise.all(setLists.map(async (setList) => ({
      ...setList,
      itemCount: (await ctx.db
        .query("setListItems")
        .withIndex("by_setList_position", (index) => index.eq("setListId", setList._id))
        .collect()).length,
    })));
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
      items: items.flatMap((item, index) => {
        const song = songs[index];
        if (!song || song.ownerId !== ownerId || song.publicationState !== "private") return [];
        return [{
          _id: item._id,
          songId: song._id,
          title: song.title,
          position: item.position,
          displaySettings: item.displaySettings,
        }];
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
  args: { setListId: v.id("setLists"), songId: v.id("songs") },
  handler: async (ctx, args) => {
    const ownerId = await currentOwner(ctx);
    await ownedSetList(ctx, args.setListId, ownerId);
    const song = await ctx.db.get("songs", args.songId);
    if (!song || song.ownerId !== ownerId) throw new Error("Save this song to My Library before adding it");
    if (song.publicationState !== "private") throw new Error("Only private songs can be added to a set list");

    const lastItem = await ctx.db
      .query("setListItems")
      .withIndex("by_setList_position", (index) => index.eq("setListId", args.setListId))
      .order("desc")
      .first();
    const now = Date.now();
    const itemId = await ctx.db.insert("setListItems", {
      ownerId,
      setListId: args.setListId,
      songId: args.songId,
      position: (lastItem?.position ?? -1) + 1,
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
