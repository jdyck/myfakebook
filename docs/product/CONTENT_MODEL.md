# MyFakebook content model

This document owns song concepts, fields, relationships, storage authority, and invariants. It intentionally separates product concepts from the database schema. [Requirements](../../local/docs/product/REQUIREMENTS.md) define user workflows, delivery priorities, and acceptance criteria.

## Core model

### Song

A song is the single persisted music-content entity. A song contains one lead-sheet arrangement; materially different arrangements are separate songs. There is no separate Work or Chart entity.

#### Song content

Song notation is stored as ABC.

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

Every saved song has one owner and one publication state. Publishing changes the visibility of that record; it does not copy the song into a second table or assign it a second identity.

| Song state | Owner | Who can edit the stored song | Where it appears |
|---|---|---|---|
| Private | User | Owning user | The owner’s My Library |
| Published | Admin-owned user record | Owning admin | The owner’s My Library and the public library |

The owner’s My Library lists both private and published songs with a state badge. The public library lists only published songs. Publishing and unpublishing require the admin role and update the existing record. The regular save mutation cannot set publication state. Editing a published song updates its public version immediately.

Opening another owner’s public song for experimentation changes only the editor’s working copy. A signed-in user who saves that copy creates a separate song record owned by that user.

### Chord-change variant

A chord-change variant is an alternative approach to a song's harmony. It may apply to one or more measures in a song.

A variant should have:

- Measure range
- Chord content
- Optional notes

Use variants when the melody, lyrics, meter, and overall song identity remain the same and the changes are local harmonic alternatives. Use a separate song when the arrangement is materially different, such as a different meter, form, melody, or full-song treatment.

### Set list

A set list is an ordered collection of a user’s private songs. Users can only see their own set lists.

A set list cannot contain a published song or another owner’s song. A user must save another owner’s public song as a private copy first.

A song may be on more than one set list.

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
└── Set-list references

Editor workspace
└── Unsaved song content (discarded on refresh)
```

## Storage model

Most song content is stored in an ABC field. Other fields support product behavior and structured information that does not belong in ABC.

Use one source of truth for each kind of data:

| Data | Authority |
|---|---|
| Ownership, visibility, tags, writers, title, subtitle, publication year | Structured song metadata |
| Notation and playable song body | ABC content on the song record |
| Current display choices | Browser/session state, or a set-list item when intentionally saved |
| MusicXML, PDF, PNG, SVG, and ABC files | Generated from the current song and display settings |

The database song record is the source of truth. An ABC download is a portable serialization of that record, not a second independently edited copy.

ABC is the portable song format; a collection is a ZIP containing ABC files. Import, download, and bulk-download workflows and priorities are defined in the [requirements](../../local/docs/product/REQUIREMENTS.md#requirements).

## Important invariants

- Each persisted song has one owner and one record, regardless of publication state.
- Only an admin can publish or unpublish a song; those changes preserve its record ID and owner.
- Editing a published song updates the public version immediately.
- A user cannot modify another owner’s stored song.
- Saving another owner’s public song creates an independent song owned by the user.
- Unsaved editor content exists only in browser memory and is discarded on refresh.
- A set list references only private songs owned by the user.
- A private song can contain content that the admin has never reviewed.
- A published song must be unpublished before its owner can remove it.
- No edit-history model is required.
