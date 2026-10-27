/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("binder operations use the new tables and enforce ownership", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner" });
  const other = t.withIdentity({ subject: "other" });
  const firstSong = await owner.mutation(api.songs.save, { title: "First", abc: "K:C\nC|" });
  const secondSong = await owner.mutation(api.songs.save, { title: "Second", abc: "K:C\nD|" });
  const binderId = await owner.mutation(api.binders.create, { name: "  Gig  " });
  const firstItem = await owner.mutation(api.binders.addSong, { binderId, songId: firstSong });
  const secondItem = await owner.mutation(api.binders.addSong, { binderId, songId: secondSong });

  expect(await owner.query(api.binders.listMine, {})).toEqual([
    expect.objectContaining({ _id: binderId, name: "Gig", itemCount: 2, songIds: [firstSong, secondSong] }),
  ]);
  expect(await other.query(api.binders.listMine, {})).toEqual([]);
  expect(await other.query(api.binders.get, { id: binderId })).toBeNull();
  expect(await owner.query(api.binders.get, { id: "not-an-id" })).toBeNull();
  await expect(other.mutation(api.binders.rename, { id: binderId, name: "Stolen" })).rejects.toThrow("Binder not found");
  await expect(other.mutation(api.binders.removeItem, { binderId, itemId: firstItem })).rejects.toThrow("Binder not found");
  await expect(owner.mutation(api.binders.addSong, { binderId, songId: firstSong })).rejects.toThrow("already in this binder");
  await expect(owner.mutation(api.binders.reorder, { binderId, itemIds: [firstItem, firstItem] })).rejects.toThrow("out of date");

  await owner.mutation(api.binders.reorder, { binderId, itemIds: [secondItem, firstItem] });
  await owner.mutation(api.binders.rename, { id: binderId, name: "Renamed" });
  expect(await owner.query(api.binders.get, { id: binderId })).toMatchObject({
    name: "Renamed", items: [{ _id: secondItem, position: 0 }, { _id: firstItem, position: 1 }],
  });
  await owner.mutation(api.binders.removeItem, { binderId, itemId: firstItem });
  await owner.mutation(api.binders.remove, { id: binderId });
  await t.run(async (ctx) => {
    expect(await ctx.db.query("binderItems").collect()).toEqual([]);
    expect(await ctx.db.query("binders").collect()).toEqual([]);
    expect(await ctx.db.query("songs").collect()).toHaveLength(2);
  });
});

test("removing a song cleans up its binder items and updates the binder", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner" });
  const songId = await owner.mutation(api.songs.save, { title: "Song", abc: "K:C\nC|" });
  const binderId = await owner.mutation(api.binders.create, { name: "Gig" });
  await owner.mutation(api.binders.addSong, { binderId, songId });
  await t.run((ctx) => ctx.db.patch("binders", binderId, { updatedAt: 0 }));

  await owner.mutation(api.songs.remove, { id: songId });

  expect(await owner.query(api.binders.get, { id: binderId })).toMatchObject({ items: [] });
  expect((await owner.query(api.binders.get, { id: binderId }))!.updatedAt).toBeGreaterThan(0);
});


test("legacy saved links resolve without the retired tables and enforce ownership", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner" });
  const songId = await owner.mutation(api.songs.save, { title: "Song", abc: "K:C\nC|" });
  const binderId = await owner.mutation(api.binders.create, { name: "Migrated" });
  const itemId = await owner.mutation(api.binders.addSong, { binderId, songId });
  await t.run(async (ctx) => {
    await ctx.db.patch("binders", binderId, { legacySetListId: "retired-set-list-id" });
    await ctx.db.patch("binderItems", itemId, { legacySetListItemId: "retired-item-id" });
  });

  expect(await owner.query(api.binders.get, { id: "retired-set-list-id" })).toMatchObject({
    _id: binderId, items: [{ _id: itemId, legacySetListItemId: "retired-item-id" }],
  });
  expect(await t.withIdentity({ subject: "other" }).query(api.binders.get, {
    id: "retired-set-list-id",
  })).toBeNull();
});
