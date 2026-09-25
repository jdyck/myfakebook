import { v } from "convex/values";

export const songDisplaySettingsValidator = v.object({
  transposition: v.number(),
  showChords: v.boolean(),
  showLyrics: v.boolean(),
});
