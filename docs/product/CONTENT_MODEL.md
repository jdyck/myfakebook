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

### Public and private songs

Public and private songs share the same product content model. Ownership, visibility, and permissions determine their scope:

| Song scope | Owner | Who can edit the stored song | Persistence behavior |
|---|---|---|---|
| Public song | Site | Site admin | Published songs appear in the public library |
| Private song | User | Owning user | Saved to that user’s private library |

Only published public songs are visible in the public library. Unpublished public songs are admin-only. Opening a public song for experimentation changes only the editor’s unsaved working copy. A signed-in user who wants to keep an edit saves it to the private library, creating an independent private song.

### Chord-change variant

A chord-change variant is an alternative approach to a song's harmony. It may apply to one or more measures in a song.

A variant should have:

- Measure range
- Chord content
- Optional notes

Use variants when the melody, lyrics, meter, and overall song identity remain the same and the changes are local harmonic alternatives. Use a separate song when the arrangement is materially different, such as a different meter, form, melody, or full-song treatment.

### Set list

A set list is an ordered collection of private songs owned by a user. Users can only see their own set lists.

A set list cannot directly contain a public song. The user must save a copy to their private library first.

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
└── Published public songs

Private library (per user)
├── Private songs
|   ├── Chord-change variants
|   └── Set-list references
└── User set lists

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

- A user cannot modify the stored public song directly.
- Saving a public song to a private library creates an independent private song.
- Unsaved editor content exists only in browser memory and is discarded on refresh.
- A set list references a user-owned private song, not a public song.
- A private song can contain content that the admin has never reviewed.
- Removing a private song does not remove the public song it was copied from.
- No edit-history model is required.
