# Song content

Songs store structured content in this format:

```json
{
  "meter": "3/4",
  "unitLength": "1/4",
  "measures": [
    {
      "chords": [["F", 2], ["C7", 1]],
      "melody": "d2 A",
      "lyrics": "Toy- land!"
    }
  ]
}
```

Each chord is a `[name, duration]` pair. Durations are positive multiples of `unitLength`, so `2` above means two quarter notes. Chords run consecutively from the start of the measure; an empty chord name represents a gap. Melody and lyrics use ABC syntax within each measure.

The object is the source of truth. Loading uses `content` first; if it is blank (absent, null, `{}`, or no measures), it falls back to inline `abc`, then to separate-parts `abcParts`. ABC imports build the object, which is persisted on the next save. Inline ABC and separate-parts ABC are kept alongside it for compatibility and notation layout.

The editor has four synchronized tabs: **Inline chords**, **Easy**, **Separate parts**, and **JSON**. Easy provides aligned rows for chords, melody, and lyrics. Inline ABC feeds engraving, playback, and exports. The separate-parts tab uses `%%staves (chords melody)`, `V:chords`, and `V:melody`, with timed `x` spacers for chords. Valid edits in any tab update the same object and preview. Incomplete JSON or unmatched voice durations stay in the editor while the last valid song remains in the preview. Copy and Format apply to the selected tab.

## Implementation

- `src/lib/songs/song-content.ts` defines and converts structured content.
- `src/lib/songs/song-source.ts` resolves content and legacy ABC inputs.
- `src/lib/notation/abc-voices.ts` converts inline and separate-parts ABC.
- `convex/validators.ts` validates persisted content at the database boundary.

When changing the content format, update the resolver, Convex validator, and their tests together.
