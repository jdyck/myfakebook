/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";

import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

afterEach(() => vi.useRealTimers());

test("copies multiple pages, remaps parents, preserves content, and leaves sources intact", async () => {
  vi.useFakeTimers();
  const t = convexTest(schema, modules);
  const songId = await t.withIdentity({ subject: "owner" }).mutation(api.songs.save, { title: "Song", abc: "K:C\nC|" });
  const displaySettings = { transposition: 3, showChords: false, showLyrics: true, showParts: false, showFirstLineClefOnly: true };
  const sources = await t.run(async (ctx) => {
    const parents = [];
    for (let index = 0; index < 101; index += 1) {
      parents.push(await ctx.db.insert("setLists", {
        ownerId: index % 2 ? "other" : "owner", name: `Binder ${index}`, updatedAt: index,
      }));
    }
    const items = [];
    for (let index = 0; index < 102; index += 1) {
      items.push(await ctx.db.insert("setListItems", {
        ownerId: "owner", setListId: parents[0], songId, position: 101 - index,
        ...(index % 2 ? { displaySettings } : {}),
      }));
    }
    return { parents, items };
  });

  expect(await t.mutation(internal.migrations.copySetListsToBinders, {}))
    .toEqual({ phase: "binders", copied: 100, skipped: 0, done: false });
  await t.finishAllScheduledFunctions(() => vi.runAllTimers());

  await t.run(async (ctx) => {
    const binders = await ctx.db.query("binders").collect();
    const items = await ctx.db.query("binderItems").collect();
    expect(binders).toHaveLength(101);
    expect(items).toHaveLength(102);
    for (const binder of binders) {
      const source = await ctx.db.get("setLists", binder.legacySetListId!);
      expect(binder).toMatchObject({ ownerId: source!.ownerId, name: source!.name, updatedAt: source!.updatedAt });
      expect(binder._id).not.toBe(source!._id);
    }
    for (const item of items) {
      const source = await ctx.db.get("setListItems", item.legacySetListItemId!);
      expect(item).toMatchObject({ ownerId: source!.ownerId, songId, position: source!.position });
      expect(item.displaySettings).toEqual(source!.displaySettings);
      expect((await ctx.db.get("binders", item.binderId))?.legacySetListId).toBe(source!.setListId);
    }
    expect((await ctx.db.query("setLists").collect()).map((row) => row._id)).toEqual(sources.parents);
    expect((await ctx.db.query("setListItems").collect()).map((row) => row._id)).toEqual(sources.items);
  });

  const owner = t.withIdentity({ subject: "owner" });
  const migrated = await owner.query(api.binders.get, { id: sources.parents[0] });
  expect(migrated?.items.map((item) => item.position)).toEqual(Array.from({ length: 102 }, (_, index) => index));
  expect(migrated?.items[0].legacySetListItemId).toBe(sources.items[101]);
  expect(await t.withIdentity({ subject: "other" }).query(api.binders.get, { id: sources.parents[0] })).toBeNull();
});

test("reruns skip existing copies and preserve edits and new binders", async () => {
  vi.useFakeTimers();
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner" });
  const songId = await owner.mutation(api.songs.save, { title: "Song", abc: "K:C\nC|" });
  const sourceId = await t.run(async (ctx) => {
    const id = await ctx.db.insert("setLists", { ownerId: "owner", name: "Old", updatedAt: 123 });
    await ctx.db.insert("setListItems", { ownerId: "owner", setListId: id, songId, position: 0 });
    return id;
  });

  await t.mutation(internal.migrations.copySetListsToBinders, {});
  await t.finishAllScheduledFunctions(() => vi.runAllTimers());
  const migrated = (await owner.query(api.binders.get, { id: sourceId }))!;
  await owner.mutation(api.binders.rename, { id: migrated._id, name: "Edited" });
  await owner.mutation(api.binders.updateDisplaySettings, {
    binderId: migrated._id, itemId: migrated.items[0]._id,
    displaySettings: { transposition: 5, showChords: true, showLyrics: false, showParts: true },
  });
  const nativeId = await owner.mutation(api.binders.create, { name: "New" });

  expect(await t.mutation(internal.migrations.copySetListsToBinders, {}))
    .toEqual({ phase: "binders", copied: 0, skipped: 1, done: false });
  await t.finishAllScheduledFunctions(() => vi.runAllTimers());

  expect(await owner.query(api.binders.get, { id: sourceId })).toMatchObject({
    _id: migrated._id, name: "Edited", items: [{ _id: migrated.items[0]._id, displaySettings: { transposition: 5 } }],
  });
  expect(await owner.query(api.binders.get, { id: nativeId })).toMatchObject({ name: "New" });
  await t.run(async (ctx) => {
    expect(await ctx.db.query("binders").collect()).toHaveLength(2);
    expect(await ctx.db.query("binderItems").collect()).toHaveLength(1);
  });
});

test("empty sources finish without creating data", async () => {
  vi.useFakeTimers();
  const t = convexTest(schema, modules);
  await t.mutation(internal.migrations.copySetListsToBinders, {});
  await t.finishAllScheduledFunctions(() => vi.runAllTimers());
  await t.run(async (ctx) => {
    expect(await ctx.db.query("binders").collect()).toEqual([]);
    expect(await ctx.db.query("binderItems").collect()).toEqual([]);
  });
});

test("items cannot be copied before their parent has been migrated", async () => {
  const t = convexTest(schema, modules);
  const songId = await t.withIdentity({ subject: "owner" }).mutation(api.songs.save, { title: "Song", abc: "K:C\nC|" });
  await t.run(async (ctx) => {
    const setListId = await ctx.db.insert("setLists", { ownerId: "owner", name: "Old", updatedAt: 0 });
    await ctx.db.insert("setListItems", { ownerId: "owner", setListId, songId, position: 0 });
  });
  await expect(t.mutation(internal.migrations.copySetListsToBinders, { phase: "items" }))
    .rejects.toThrow("Missing migrated binder");
  expect(await t.run((ctx) => ctx.db.query("binderItems").collect())).toEqual([]);
});
