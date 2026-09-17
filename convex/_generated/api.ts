// This lightweight placeholder is replaced by `npx convex dev` after the
// project is connected to a Convex deployment.

import { makeFunctionReference } from "convex/server";

import type { Doc, Id } from "./dataModel";

export const api = {
  scores: {
    listMine: makeFunctionReference<"query", Record<string, never>, Doc<"scores">[]>("scores:listMine"),
    save: makeFunctionReference<
      "mutation",
      { id?: Id<"scores">; title: string; abc: string; updatedAt: number },
      Id<"scores">
    >("scores:save"),
  },
};
