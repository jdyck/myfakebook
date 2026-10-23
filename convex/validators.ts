import { v } from "convex/values";

// Convex has no tuple validator; validateSongContent checks each pair's length,
// element order and positive duration before it is stored.
const structuredSongContentValidator = v.object({
  meter: v.string(),
  unitLength: v.string(),
  measures: v.array(v.object({
    chords: v.array(v.array(v.union(v.string(), v.number()))),
    melody: v.string(),
    lyrics: v.string(),
  })),
});

// Older records can have an absent, null or empty object before ABC is imported.
export const songContentValidator = v.union(structuredSongContentValidator, v.null(), v.object({}));

export const songDisplaySettingsValidator = v.object({
  transposition: v.number(),
  showChords: v.boolean(),
  showLyrics: v.boolean(),
  showParts: v.optional(v.boolean()),
  showFirstLineClefOnly: v.optional(v.boolean()),
});
