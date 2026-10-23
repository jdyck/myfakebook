/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api, internal } from "./_generated/api";
import schema from "./schema";
import { abcToSongContent, songContentToAbc, type SongContent } from "../src/lib/songs/song-content";

const modules = import.meta.glob("./**/*.ts");
const content: SongContent = {
  meter: "3/4",
  unitLength: "1/4",
  measures: [{ chords: [["F", 2], ["C7", 1]], melody: "d2 A", lyrics: "Toy- land!" }],
};

test("song objects round-trip without ABC and are isolated by owner", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner" });
  const other = t.withIdentity({ subject: "other" });
  const id = await owner.mutation(api.songs.save, { title: "Song", content });

  expect(await owner.query(api.songs.listMySongs, {})).toEqual([
    expect.objectContaining({ _id: id, abc: songContentToAbc(content, "Song"), content }),
  ]);
  expect(await other.query(api.songs.listMySongs, {})).toEqual([]);
  await expect(other.mutation(api.songs.save, { id, title: "Changed", content }))
    .rejects.toThrow("Song not found");
});

test("object and ABC edits keep both representations synchronized", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner" });
  const abc = "K:C\nC D E F|";
  const id = await owner.mutation(api.songs.save, { title: "Song", abc });

  await owner.mutation(api.songs.save, { id, title: "Song", content });
  expect(await owner.query(api.songs.listMySongs, {})).toEqual([
    expect.objectContaining({ _id: id, abc: songContentToAbc(content, "Song", abc), content }),
  ]);

  const nextContent = { ...content, measures: [] };
  await owner.mutation(api.songs.save, { id, title: "Song", content: nextContent });
  await owner.mutation(api.songs.save, { id, title: "Renamed", abc: "K:D\nD|" });
  expect(await owner.query(api.songs.listMySongs, {})).toEqual([
    expect.objectContaining({ _id: id, title: "Renamed", abc: "K:D\nD|", content: abcToSongContent("K:D\nD|") }),
  ]);
});

test("duplicate detection compares the object as well as title and ABC", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner" });
  const args = { title: "Song", content };
  const id = await owner.mutation(api.songs.save, args);

  expect(await owner.mutation(api.songs.save, {
    title: "Song",
    content: { measures: content.measures, unitLength: content.unitLength, meter: content.meter },
  })).toBe(id);
  expect(await owner.mutation(api.songs.save, {
    ...args, content: { ...content, meter: "4/4" },
  })).not.toBe(id);
  expect(await owner.mutation(api.songs.save, { title: "Song", abc: "" })).not.toBe(id);
});

test("new songs require an object or ABC", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner" });
  await expect(owner.mutation(api.songs.save, { title: "Song" }))
    .rejects.toThrow("Song content or ABC is required");
});

test("object-only songs can be published and read through every public query", async () => {
  const t = convexTest(schema, modules);
  const admin = t.withIdentity({ subject: "admin", metadata: { role: "admin" } });
  const id = await admin.mutation(api.songs.save, { title: "Song", content });
  await admin.mutation(api.songs.publish, { id });

  const expected = [expect.objectContaining({ id, content })];
  expect(await t.query(api.songs.listPublicSongs, {})).toEqual(expected);
  expect(await admin.query(api.songs.listAdminPublicSongs, {})).toEqual(expected);
  expect(await t.query(internal.songs.listPublicSongsForCountry, { country: "other" })).toEqual(expected);
});

test("binders return objects only while the viewer can access the song", async () => {
  const t = convexTest(schema, modules);
  const admin = t.withIdentity({ subject: "admin", metadata: { role: "admin" } });
  const viewer = t.withIdentity({ subject: "viewer" });
  const songId = await admin.mutation(api.songs.save, { title: "Song", content });
  await admin.mutation(api.songs.publish, { id: songId });
  const setListId = await viewer.mutation(api.binders.create, { name: "Set" });
  await viewer.mutation(api.binders.addSong, { binderId: setListId, songId });

  expect((await viewer.query(api.binders.get, { id: setListId }))?.items).toEqual([
    expect.objectContaining({ songId, content, canOpen: true }),
  ]);
  await admin.mutation(api.songs.unpublish, { id: songId });
  expect((await viewer.query(api.binders.get, { id: setListId }))?.items).toEqual([
    expect.objectContaining({ songId, content: null, canOpen: false }),
  ]);
});

test("catalog imports persist song objects", async () => {
  const t = convexTest(schema, modules);
  const admin = t.withIdentity({ subject: "admin", metadata: { role: "admin" } });
  await admin.mutation(api.songs.ensureCatalogSongs, {
    songs: [{ id: "catalog-song", title: "Song", writers: "", rhythm: "", abc: "K:C\nC|", content }],
  });

  expect(await t.query(api.songs.listPublicSongs, {})).toEqual([
    expect.objectContaining({ catalogId: "catalog-song", content }),
  ]);
});


test.each([
  [["F"]],
  [[2, "F"]],
  [["F", 0]],
  [["F", -1]],
  [["F", 2, "extra"]],
  [["F", Number.NaN]],
].map((chords) => ({ chords })))("invalid chord pairs are rejected: $chords", async ({ chords }) => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner" });
  await expect(owner.mutation(api.songs.save, {
    title: "Song", content: { ...content, measures: [{ ...content.measures[0], chords }] },
  })).rejects.toThrow();
  expect(await owner.query(api.songs.listMySongs, {})).toEqual([]);
});

test.each(["", "3/0", "-3/4", "waltz"])("invalid meters are rejected: %s", async (meter) => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner" });
  await expect(owner.mutation(api.songs.save, { title: "Song", content: { ...content, meter } }))
    .rejects.toThrow("Meter");
});

test("ABC saves persist structured content", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner" });
  const abc = 'M:3/4\nL:1/4\nK:F\n"F"d2 "C7"A |\nw:Toy- land!';
  const id = await owner.mutation(api.songs.save, { title: "Song", abc });
  expect(await t.run((ctx) => ctx.db.get("songs", id))).toMatchObject({ abc, content });
});

test("old ABC records are readable as objects and upgraded when edited", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner" });
  const abc = 'M:3/4\nL:1/4\nK:F\n"F"d2 "C7"A |\nw:Toy- land!';
  const id = await t.run((ctx) => ctx.db.insert("songs", {
    ownerId: "owner", title: "Song", writers: "", rhythm: "", abc,
    publicationState: "private", updatedAt: 0,
  }));
  expect(await owner.query(api.songs.listMySongs, {})).toEqual([expect.objectContaining({ content })]);
  await owner.mutation(api.songs.save, { id, title: "Renamed" });
  expect(await t.run((ctx) => ctx.db.get("songs", id))).toMatchObject({ abc, content });
});

test("loading prefers objects, then inline ABC, then separate-parts ABC", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner" });
  const abc = 'M:3/4\nL:1/4\nK:F\n"Bb"d2 "C7"A |\nw:Toy- land!';
  const abcParts = 'M:3/4\nL:1/4\nK:F\nV:chords\n"Gm"x2 "C7"x |\nV:melody\nd2 A |\nw:Toy- land!';
  const base = { ownerId: "owner", title: "Song", writers: "", rhythm: "", publicationState: "private" as const, updatedAt: 0 };
  const ids = await t.run(async (ctx) => [
    await ctx.db.insert("songs", { ...base, content, abc, abcParts }),
    await ctx.db.insert("songs", { ...base, content: {}, abc, abcParts }),
    await ctx.db.insert("songs", { ...base, content: null, abc: "", abcParts }),
  ]);
  const songs = await owner.query(api.songs.listMySongs, {});
  expect(songs.find((song) => song._id === ids[0])?.content).toEqual(content);
  expect(songs.find((song) => song._id === ids[1])?.content.measures[0].chords[0][0]).toBe("Bb");
  expect(songs.find((song) => song._id === ids[2])?.content.measures[0].chords[0][0]).toBe("Gm");
});

test("saving separate ABC builds and persists the authoritative object and inline preview source", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner" });
  const abcParts = 'M:3/4\nL:1/4\nK:F\nV:chords\n"F"x2 "C7"x |\nV:melody\nd2 A |\nw:Toy- land!';
  const id = await owner.mutation(api.songs.save, { title: "Song", abcParts });
  const song = await t.run((ctx) => ctx.db.get("songs", id));
  expect(song?.content).toEqual(content);
  expect(song?.abc).toContain('"F"d2 "C7"A');
  expect(song?.abc).not.toContain("V:");
  expect(song?.abcParts).toBe(abcParts);
});
