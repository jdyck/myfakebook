import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { requireOwner } from "./auth";
import { songDisplaySettingsValidator } from "./validators";
import { withSongContent } from "./songStore";

function isWorldwidePublicSong(song: Doc<"songs"> | null) {
  return song?.publicationState === "published" && (song.publicationTerritory ?? "worldwide") === "worldwide";
}

async function ownedBinder(
  ctx: MutationCtx,
  id: Id<"binders">,
  ownerId: string,
) {
  const binder = await ctx.db.get("binders", id);
  if (!binder || binder.ownerId !== ownerId) throw new Error("Binder not found");
  return binder;
}

async function ownedBinderItem(
  ctx: MutationCtx,
  binderId: Id<"binders">,
  itemId: Id<"binderItems">,
  ownerId: string,
) {
  await ownedBinder(ctx, binderId, ownerId);
  const item = await ctx.db.get("binderItems", itemId);
  if (!item || item.ownerId !== ownerId || item.binderId !== binderId) {
    throw new Error("Binder item not found");
  }
  return item;
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireOwner(ctx);
    const binders = await ctx.db
      .query("binders")
      .withIndex("by_owner_updatedAt", (index) => index.eq("ownerId", ownerId))
      .order("desc")
      .collect();

    return Promise.all(binders.map(async (binder) => {
      const items = await ctx.db
        .query("binderItems")
        .withIndex("by_binder_position", (index) => index.eq("binderId", binder._id))
        .collect();
      return {
        ...binder,
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
        .collect()
        .then((songs) => songs.filter(isWorldwidePublicSong)),
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
        isPublic: isWorldwidePublicSong(song),
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
  // Strings allow old saved links to resolve through the migration mapping.
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const binderId = ctx.db.normalizeId("binders", args.id);
    const legacyId = ctx.db.normalizeId("setLists", args.id);
    const binder = binderId
      ? await ctx.db.get("binders", binderId)
      : legacyId
        ? await ctx.db.query("binders")
          .withIndex("by_legacySetListId", (q) => q.eq("legacySetListId", legacyId))
          .unique()
        : null;
    if (!binder || binder.ownerId !== ownerId) return null;

    const items = await ctx.db
      .query("binderItems")
      .withIndex("by_binder_position", (index) => index.eq("binderId", binder._id))
      .order("asc")
      .collect();
    const songs = await Promise.all(items.map((item) => ctx.db.get("songs", item.songId)));

    return {
      ...binder,
      items: items.map((item, index) => {
        const song = songs[index];
        const canOpen = Boolean(song && (song.ownerId === ownerId || isWorldwidePublicSong(song)));
        const source = canOpen && song ? withSongContent(song) : null;
        return {
          _id: item._id,
          legacySetListItemId: item.legacySetListItemId,
          songId: item.songId,
          title: canOpen && song ? song.title : "Song no longer public",
          canOpen,
          isOwned: song?.ownerId === ownerId,
          abc: source?.abc ?? null,
          abcParts: source?.abcParts ?? null,
          content: source?.content ?? null,
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
    if (!name) throw new Error("Enter a binder name");
    if (name.length > 80) throw new Error("Binder names must be 80 characters or fewer");
    return ctx.db.insert("binders", { ownerId, name, updatedAt: Date.now() });
  },
});

export const rename = mutation({
  args: { id: v.id("binders"), name: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const binder = await ownedBinder(ctx, args.id, ownerId);
    const name = args.name.trim();
    if (!name) throw new Error("Enter a binder name");
    if (name.length > 80) throw new Error("Binder names must be 80 characters or fewer");
    await ctx.db.patch("binders", binder._id, { name, updatedAt: Date.now() });
    return binder._id;
  },
});

export const remove = mutation({
  args: { id: v.id("binders") },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const binder = await ownedBinder(ctx, args.id, ownerId);
    const items = await ctx.db
      .query("binderItems")
      .withIndex("by_binder_position", (index) => index.eq("binderId", args.id))
      .collect();
    for (const item of items) await ctx.db.delete("binderItems", item._id);
    await ctx.db.delete("binders", binder._id);
    return binder._id;
  },
});

export const addSong = mutation({
  args: {
    binderId: v.id("binders"),
    songId: v.id("songs"),
  },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    await ownedBinder(ctx, args.binderId, ownerId);

    const song = await ctx.db.get("songs", args.songId);
    if (!song || (song.ownerId !== ownerId && !isWorldwidePublicSong(song))) {
      throw new Error("Song is not available to add");
    }
    const songId = song._id;

    const items = await ctx.db
      .query("binderItems")
      .withIndex("by_binder_position", (index) => index.eq("binderId", args.binderId))
      .order("desc")
      .collect();
    if (items.some((item) => item.songId === songId)) {
      throw new Error("Song is already in this binder");
    }
    const now = Date.now();
    const itemId = await ctx.db.insert("binderItems", {
      ownerId,
      binderId: args.binderId,
      songId,
      position: (items[0]?.position ?? -1) + 1,
      displaySettings: { transposition: 0, showChords: true, showLyrics: true, showParts: true, showFirstLineClefOnly: true },
    });
    await ctx.db.patch("binders", args.binderId, { updatedAt: now });
    return itemId;
  },
});

export const updateDisplaySettings = mutation({
  args: {
    binderId: v.id("binders"),
    itemId: v.id("binderItems"),
    displaySettings: songDisplaySettingsValidator,
  },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const item = await ownedBinderItem(ctx, args.binderId, args.itemId, ownerId);
    if (!Number.isInteger(args.displaySettings.transposition) || args.displaySettings.transposition < -12 || args.displaySettings.transposition > 12) {
      throw new Error("Transposition must be between -12 and +12 semitones");
    }
    await ctx.db.patch("binderItems", item._id, { displaySettings: args.displaySettings });
    await ctx.db.patch("binders", args.binderId, { updatedAt: Date.now() });
    return item._id;
  },
});

export const removeItem = mutation({
  args: { binderId: v.id("binders"), itemId: v.id("binderItems") },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const item = await ownedBinderItem(ctx, args.binderId, args.itemId, ownerId);
    await ctx.db.delete("binderItems", item._id);
    await ctx.db.patch("binders", args.binderId, { updatedAt: Date.now() });
    return item._id;
  },
});

export const reorder = mutation({
  args: { binderId: v.id("binders"), itemIds: v.array(v.id("binderItems")) },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    await ownedBinder(ctx, args.binderId, ownerId);
    const items = await ctx.db
      .query("binderItems")
      .withIndex("by_binder_position", (index) => index.eq("binderId", args.binderId))
      .collect();
    const itemIds = new Set(args.itemIds);
    if (itemIds.size !== items.length || args.itemIds.length !== items.length ||
      items.some((item) => item.ownerId !== ownerId || !itemIds.has(item._id))) {
      throw new Error("Binder order is out of date");
    }

    for (const [position, itemId] of args.itemIds.entries()) {
      await ctx.db.patch("binderItems", itemId, { position });
    }
    await ctx.db.patch("binders", args.binderId, { updatedAt: Date.now() });
    return args.binderId;
  },
});
