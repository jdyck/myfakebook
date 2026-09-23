/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("an admin can publish a song from My Songs", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({
    subject: "admin_1",
    metadata: { role: "admin" },
  });

  const privateSongId = await asAdmin.mutation(api.scores.save, {
    title: "Autumn Song",
    abc: "T:Autumn Song\nK:C\nC D E F|",
    updatedAt: Date.now(),
  });

  await asAdmin.mutation(api.catalog.publishFromLibrary, {
    scoreId: privateSongId,
  });

  const publishedCatalog = await t.query(api.catalog.listPublished, {});

  expect(publishedCatalog).toEqual([
    expect.objectContaining({
      title: "Autumn Song",
      abc: "T:Autumn Song\nK:C\nC D E F|",
      status: "published",
    }),
  ]);
});

test("an admin can remove a public song", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({
    subject: "admin_1",
    metadata: { role: "admin" },
  });

  const privateSongId = await asAdmin.mutation(api.scores.save, {
    title: "Autumn Song",
    abc: "T:Autumn Song\nK:C\nC D E F|",
    updatedAt: Date.now(),
  });

  const publicSongId = await asAdmin.mutation(api.catalog.publishFromLibrary, {
    scoreId: privateSongId,
  });

  await asAdmin.mutation(api.catalog.remove, { id: publicSongId });

  expect(await t.query(api.catalog.listPublished, {})).toEqual([]);
});

test("a non-admin cannot remove a public song", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({
    subject: "admin_1",
    metadata: { role: "admin" },
  });
  const asUser = t.withIdentity({ subject: "user_1" });

  const privateSongId = await asAdmin.mutation(api.scores.save, {
    title: "Autumn Song",
    abc: "T:Autumn Song\nK:C\nC D E F|",
    updatedAt: Date.now(),
  });

  const publicSongId = await asAdmin.mutation(api.catalog.publishFromLibrary, {
    scoreId: privateSongId,
  });

  await expect(asUser.mutation(api.catalog.remove, { id: publicSongId })).rejects.toThrow("Not authorized");

  expect(await t.query(api.catalog.listPublished, {})).toEqual([
    expect.objectContaining({
      _id: publicSongId,
      title: "Autumn Song",
      status: "published",
    }),
  ]);
});
