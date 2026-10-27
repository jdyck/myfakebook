/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
afterEach(() => vi.unstubAllEnvs());
async function setup() {
  const t = convexTest(schema, modules);
  const admin = t.withIdentity({ subject: "admin", metadata: { role: "admin" } });
  const user = t.withIdentity({ subject: "user" });
  const binderId = await admin.mutation(api.binders.create, { name: "Holiday Songs" });
  const songs = [];
  for (const territory of ["none", "US", "worldwide"] as const) {
    const id = await admin.mutation(api.songs.save, { title: territory, abc: "K:C\nC|" });
    await admin.mutation(api.songs.setPublicDomain, { id, territory });
    await admin.mutation(api.binders.addSong, { binderId, songId: id });
    songs.push(id);
  }
  return { t, admin, user, binderId, songs };
}

test("only admins can classify songs and publish binders; publication does not change song access", async () => {
  const { t, admin, user, binderId, songs } = await setup();
  expect(await t.query(api.binders.getPublic, { id: binderId })).toBeNull();
  const privateBinder = await user.mutation(api.binders.create, { name: "Mine" });
  await expect(user.mutation(api.binders.setPublished, { id: privateBinder, published: true })).rejects.toThrow("Not authorized");
  const privateSong = await user.mutation(api.songs.save, { title: "Mine", abc: "K:C\nD|" });
  await expect(user.mutation(api.songs.setPublicDomain, { id: privateSong, territory: "US" })).rejects.toThrow("Not authorized");
  await expect(user.mutation(api.binders.rename, { id: binderId, name: "Stolen" })).rejects.toThrow("Binder not found");
  await admin.mutation(api.binders.setPublished, { id: binderId, published: true });
  const worldwide = await t.query(api.binders.getPublic, { id: binderId });
  expect(worldwide?.items.map(s => s.title)).toEqual(["worldwide"]);
  expect(JSON.stringify(worldwide)).not.toContain(songs[0]);
  expect(worldwide).not.toHaveProperty("ownerId");
  expect((await admin.query(api.binders.get, { id: binderId }))?.items).toHaveLength(3);
  expect((await t.query(api.binders.listPublic, {}))[0].itemCount).toBe(1);
  await admin.mutation(api.binders.setPublished, { id: binderId, published: false });
  expect(await t.query(api.binders.getPublic, { id: binderId })).toBeNull();
  expect(await t.query(api.binders.listPublic, {})).toEqual([]);
});

test("US visitors see regional songs; private entries and positions never escape the public projection", async () => {
  const { t, admin, binderId } = await setup();
  await admin.mutation(api.binders.setPublished, { id: binderId, published: true });
  const us = await t.query(internal.binders.publicForCountry, { id: binderId, country: "US" });
  const elsewhere = await t.query(internal.binders.publicForCountry, { id: binderId, country: "other" });
  expect(us.binder?.items.map(s => s.title)).toEqual(["US", "worldwide"]);
  expect(elsewhere.binder?.items.map(s => s.title)).toEqual(["worldwide"]);
  expect(us.binder?.items[0]).not.toHaveProperty("position");
  expect(us.binder?.items[0]).not.toHaveProperty("ownerId");
});

test("US-only published binders are empty elsewhere and status changes are reflected on the next read", async () => {
  const { t, admin, binderId, songs } = await setup();
  await admin.mutation(api.songs.setPublicDomain, { id: songs[2], territory: "none" });
  await admin.mutation(api.binders.setPublished, { id: binderId, published: true });
  expect((await t.query(api.binders.getPublic, { id: binderId }))?.items).toEqual([]);
  expect((await t.query(api.binders.listPublic, {}))[0].itemCount).toBe(0);
  expect((await t.query(internal.binders.publicForCountry, { id: binderId, country: "US" })).binder?.items).toHaveLength(1);
  await admin.mutation(api.songs.setPublicDomain, { id: songs[1], territory: "none" });
  expect((await t.query(internal.binders.publicForCountry, { id: binderId, country: "US" })).binder?.items).toEqual([]);
  expect((await admin.query(api.binders.get, { id: binderId }))?.items).toHaveLength(3);
});

test("regional owner operations require trusted server access and still enforce ownership", async () => {
  vi.stubEnv("PUBLIC_CATALOG_ACCESS_KEY", "test-server-key");
  const regionalAccess = { key: "test-server-key", country: "US" as const };
  const { admin, user, binderId, songs } = await setup();
  const mine = await user.mutation(api.binders.create, { name: "My private set" });
  await expect(user.mutation(api.binders.addSong, { binderId: mine, songId: songs[1], regionalAccess: { key: "forged", country: "US" } })).rejects.toThrow("not available");
  await user.mutation(api.binders.addSong, { binderId: mine, songId: songs[1], regionalAccess });
  expect((await user.query(api.binders.get, { id: mine, regionalAccess }))?.items[0].title).toBe("US");
  expect((await user.query(api.binders.get, { id: mine }))?.items[0].canOpen).toBe(false);
  await expect(user.mutation(api.binders.addSong, { binderId: mine, songId: songs[0], regionalAccess })).rejects.toThrow("not available");
  expect(await user.query(api.binders.get, { id: binderId, regionalAccess })).toBeNull();
  expect((await user.query(api.binders.listAvailableSongs, { regionalAccess })).map(s => s.title)).toEqual(expect.arrayContaining(["US", "worldwide"]));
  expect((await admin.query(api.binders.get, { id: binderId }))?.items.every(item => item.canOpen)).toBe(true);
});

test("legacy records preserve access before and after the repeatable migration", async () => {
  const t = convexTest(schema, modules);
  await t.run(async ctx => {
    for (const publicationTerritory of [undefined, "US"] as const) {
      await ctx.db.insert("songs", { ownerId: "old", title: publicationTerritory ?? "worldwide", writers: "", rhythm: "", abc: "K:C\nC|", publicationState: "published", publicationTerritory, updatedAt: 0 });
    }
    await ctx.db.insert("songs", { ownerId: "old", title: "Private", writers: "", rhythm: "", abc: "K:C\nC|", publicationState: "private", updatedAt: 0 });
  });
  const before = await t.query(api.songs.listPublicSongs, {});
  expect(before.map(s => s.title)).toEqual(["worldwide"]);
  expect(await t.mutation(internal.songs.migratePublicDomainStatus, { cursor: null })).toMatchObject({ done: true });
  await t.mutation(internal.songs.migratePublicDomainStatus, { cursor: null });
  expect(await t.query(api.songs.listPublicSongs, {})).toEqual(before);
  const records = await t.run(ctx => ctx.db.query("songs").collect());
  expect(records.map(s => s.publicDomainTerritory).sort()).toEqual(["US", "none", "worldwide"]);
});

test("legacy binder migration defaults to private without unpublishing existing public binders", async () => {
  const t = convexTest(schema, modules);
  await t.run(async ctx => {
    await ctx.db.insert("binders", { ownerId: "old", name: "Legacy private", updatedAt: 0 });
    await ctx.db.insert("binders", { ownerId: "admin", name: "Already published", updatedAt: 0, published: true });
  });
  await t.mutation(internal.binders.migratePublication, { cursor: null });
  await t.mutation(internal.binders.migratePublication, { cursor: null });
  const records = await t.run(ctx => ctx.db.query("binders").collect());
  expect(records.find(b => b.name === "Legacy private")?.published).toBe(false);
  expect(records.find(b => b.name === "Already published")?.published).toBe(true);
  expect((await t.query(api.binders.listPublic, {})).map(b => b.name)).toEqual(["Already published"]);
});
