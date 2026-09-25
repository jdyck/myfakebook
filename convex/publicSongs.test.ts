/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("an admin publishes the same song in My Library", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: "admin_1", metadata: { role: "admin" } });

  const songId = await asAdmin.mutation(api.songs.save, {
    title: "Autumn Song",
    abc: "T:Autumn Song\nK:C\nC D E F|",
  });
  const publishedId = await asAdmin.mutation(api.songs.publish, { id: songId });

  expect(publishedId).toBe(songId);
  expect(await t.query(api.songs.listPublicSongs, {})).toEqual([
    expect.objectContaining({ id: songId, title: "Autumn Song" }),
  ]);
  expect(await asAdmin.query(api.songs.listMySongs, {})).toEqual([
    expect.objectContaining({ _id: songId, publicationState: "published" }),
  ]);
});

test("unpublishing keeps the song in My Library", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: "admin_1", metadata: { role: "admin" } });
  const songId = await asAdmin.mutation(api.songs.save, {
    title: "Autumn Song",
    abc: "T:Autumn Song\nK:C\nC D E F|",
  });

  await asAdmin.mutation(api.songs.publish, { id: songId });
  await asAdmin.mutation(api.songs.unpublish, { id: songId });

  expect(await t.query(api.songs.listPublicSongs, {})).toEqual([]);
  expect(await asAdmin.query(api.songs.listMySongs, {})).toEqual([
    expect.objectContaining({ _id: songId, publicationState: "private" }),
  ]);
});

test("a non-admin cannot publish or unpublish a song", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: "admin_1", metadata: { role: "admin" } });
  const asUser = t.withIdentity({ subject: "user_1" });
  const songId = await asAdmin.mutation(api.songs.save, {
    title: "Autumn Song",
    abc: "T:Autumn Song\nK:C\nC D E F|",
  });

  await expect(asUser.mutation(api.songs.publish, { id: songId })).rejects.toThrow("Not authorized");
  await asAdmin.mutation(api.songs.publish, { id: songId });
  await expect(asUser.mutation(api.songs.unpublish, { id: songId })).rejects.toThrow("Not authorized");
  expect(await t.query(api.songs.listPublicSongs, {})).toEqual([
    expect.objectContaining({ id: songId }),
  ]);
});
