# MyFakeBook content model

This document owns song concepts, fields, relationships, storage authority, and invariants. It intentionally separates product concepts from the database schema. The [architecture guide](../architecture.md) maps these concepts to the implementation. Some concepts below describe planned capabilities; consult `convex/schema.ts` for currently persisted fields.

## Core model

### Song

A song is the single persisted music-content entity. A song contains one lead-sheet arrangement; materially different arrangements are separate songs. There is no separate Work or Chart entity.

#### Song content

Structured song content is the source of truth. Inline and separate-parts ABC remain compatibility and presentation formats; see [song content](../song-content.md) for precedence and conversion rules.

- Title
- Optional subtitle, such as “Jazz Changes” or “3/4 Version,” to distinguish arrangements
- Writers, with roles such as composer or lyricist
- Melody
- Lyrics
- Chord changes
- Meter
- Base key
- Default tempo
- Notes
- Optional source song reference

#### Song metadata

- Publication year, used by the admin when evaluating public-domain eligibility
- Genre
- Global tags
- Public-library publication status
- Owner

### Ownership and publication

Every saved song has one owner and one publication setting. Publishing changes the visibility of that record; it does not copy the song into a second table or assign it a second identity. Publication can be off, limited to the U.S., or worldwide.

| Song state | Owner | Who can edit the stored song | Where it appears |
|---|---|---|---|
| None | User | Owning user | The owner’s My Library |
| U.S. | Admin-owned user record | Owning admin | The owner’s My Library and the U.S. public catalog |
| Worldwide | Admin-owned user record | Owning admin | The owner’s My Library and the public catalog worldwide |

The owner’s My Library lists songs with their publication setting. The public catalog includes worldwide songs everywhere and U.S. songs for U.S. visitors. Changing publication settings requires the admin role and updates the existing record. The regular save mutation cannot set publication settings. Editing a published song updates its public version immediately.

The regional catalog reads Vercel’s request country and calls a protected Convex HTTP action. Set the same server-only `PUBLIC_CATALOG_ACCESS_KEY` in Vercel and the Convex deployment. If either value is missing, the app falls back to the worldwide catalog.

Opening another owner’s public song for experimentation changes only the editor’s working copy. A signed-in user who saves that copy creates a separate song record owned by that user.

### Chord-change variant

A chord-change variant is an alternative approach to a song's harmony. It may apply to one or more measures in a song.

A variant should have:

- Measure range
- Chord content
- Optional notes

Use variants when the melody, lyrics, meter, and overall song identity remain the same and the changes are local harmonic alternatives. Use a separate song when the arrangement is materially different, such as a different meter, form, melody, or full-song treatment.

### Binder

A binder is an ordered collection of songs. Users can only see their own binders.

A song may be in more than one binder.

### Display settings

Display settings are current presentation choices, not changes to the song’s underlying content. They include:

- Transposition
- Visible melody
- Visible chords
- Visible lyrics
- Playback tempo
- Selected chord-change variants

Display settings are also used for downloads.

## Relationships

```text
Public library
└── View of published song records

My Library (per owner)
├── Private and published song records
├── Chord-change variants
└── Binder references

Editor workspace
└── Unsaved song content (discarded on refresh)
```

## Storage model

Structured content stores measures, chord durations, melody, and lyrics. ABC fields retain portable notation and layout information; other fields support ownership, publication, and song metadata.

Use one source of truth for each kind of data:

| Data | Authority |
|---|---|
| Ownership, visibility, tags, writers, title, subtitle, publication year | Structured song metadata |
| Measures, melody, lyrics, and chord durations | Structured `content` on the song record; legacy ABC fallback when blank |
| Compatible notation and layout | Inline `abc` and separate-parts `abcParts`, synchronized through source resolution |
| Current display choices | Browser/session state, or a binder item when intentionally saved |
| MusicXML, PDF, PNG, SVG, and ABC files | Generated from the current song and display settings |

The database song record is the source of truth. An ABC download is a portable serialization of that record, not a second independently edited copy.

ABC is a portable song format. Individual exports also support MusicXML, PDF, PNG, and SVG. Collection ZIP export is a planned capability.

## Important invariants

- Each persisted song has one owner and one record, regardless of publication state.
- Only an admin can change a song’s publication setting; those changes preserve its record ID and owner.
- Editing a published song updates the public version immediately.
- A user cannot modify another owner’s stored song.
- Saving another owner’s public song creates an independent song owned by the user.
- Unsaved editor content exists only in browser memory and is discarded on refresh.
- A binder may reference the user's own songs or worldwide published songs. U.S.-only public songs cannot be added by another owner.
- A private song can contain content that the admin has never reviewed.
- A published song must be unpublished before its owner can remove it.
- No edit-history model is required.
