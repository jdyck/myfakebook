/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("a user can remove a song from their library", async () => {
  const t = convexTest(schema, modules);
  const user = t.withIdentity({ subject: "user_1" });

  const songId = await user.mutation(api.songs.save, {
    title: "Autumn Song",
    abc: "T:Autumn Song\nK:C\nC D E F|",
  });

  await user.mutation(api.songs.remove, { id: songId });

  expect(await user.query(api.songs.listMySongs, {})).toEqual([]);
});

test("a user cannot remove another user's song", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner_1" });
  const otherUser = t.withIdentity({ subject: "user_2" });

  const songId = await owner.mutation(api.songs.save, {
    title: "Autumn Song",
    abc: "T:Autumn Song\nK:C\nC D E F|",
  });

  await expect(otherUser.mutation(api.songs.remove, { id: songId })).rejects.toThrow("Song not found");
  expect(await owner.query(api.songs.listMySongs, {})).toEqual([
    expect.objectContaining({
      _id: songId,
      title: "Autumn Song",
    }),
  ]);
});

test("a user can list all saved songs without seeing another user's songs", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner_1" });
  const otherUser = t.withIdentity({ subject: "user_2" });

  for (let index = 0; index < 10; index += 1) {
    await owner.mutation(api.songs.save, {
      title: `Song ${index}`,
      abc: `T:Song ${index}\nK:C\nC|`,
    });
  }
  await otherUser.mutation(api.songs.save, {
    title: "Someone else's song",
    abc: "T:Someone else's song\nK:C\nC|",
  });

  const songs = await owner.query(api.songs.listMySongs, {});
  expect(songs).toHaveLength(10);
  expect(songs.map((song) => song.title)).toContain("Song 9");
  expect(songs.map((song) => song.title)).not.toContain("Someone else's song");
});
