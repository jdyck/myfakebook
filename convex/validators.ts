import { v } from "convex/values";

export const songDisplaySettingsValidator = v.object({
  transposition: v.number(),
  showChords: v.boolean(),
  showLyrics: v.boolean(),
  showParts: v.optional(v.boolean()),
  showFirstLineClefOnly: v.optional(v.boolean()),
});
