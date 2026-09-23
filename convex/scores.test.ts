/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("a user can remove a song from their library", async () => {
  const t = convexTest(schema, modules);
  const user = t.withIdentity({ subject: "user_1" });

  const songId = await user.mutation(api.scores.save, {
    title: "Autumn Song",
    abc: "T:Autumn Song\nK:C\nC D E F|",
    updatedAt: Date.now(),
  });

  await user.mutation(api.scores.remove, { id: songId });

  expect(await user.query(api.scores.listMine, {})).toEqual([]);
});

test("a user cannot remove another user's song", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner_1" });
  const otherUser = t.withIdentity({ subject: "user_2" });

  const songId = await owner.mutation(api.scores.save, {
    title: "Autumn Song",
    abc: "T:Autumn Song\nK:C\nC D E F|",
    updatedAt: Date.now(),
  });

  await expect(otherUser.mutation(api.scores.remove, { id: songId })).rejects.toThrow("Score not found");
  expect(await owner.query(api.scores.listMine, {})).toEqual([
    expect.objectContaining({
      _id: songId,
      title: "Autumn Song",
    }),
  ]);
});
