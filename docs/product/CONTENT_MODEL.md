# MyFakebook content model

This document owns the concepts, fields, relationships, storage authority, and invariants the product needs to preserve. It intentionally separates product concepts from a specific database schema. [Requirements](../../local/docs/product/REQUIREMENTS.md) define user workflows, delivery priorities, and acceptance criteria.

## Core model

### Chart

A chart is the single persisted entity. “Song” and “chart” refer to the same thing in product language. There is no separate Song or Work record. Multiple arrangements or versions are represented as separate charts when needed.

#### Chart content

This will be stored in abc notation. 

- Title
- Optional subtitle, such as “Jazz Changes” or “3/4 Version” to distinguish different chart arrangements. 
- Writers, with roles such as composer or lyricist
- Melody
- Lyrics
- Chord changes
- Meter
- Base key
- Default tempo
- Notes
- Optional source chart reference

#### Chart metadata

- Publication year, used by the admin when evaluating public-domain eligibility
- Genre
- Global tags
- Public catalog status
- Owner in the system

### Public and private charts

Public and private charts have the same shape. Their behavior comes from scope and permissions:

| Chart scope | Owner | Who can edit it | Persistence behavior |
|---|---|---|---|
| Public catalog | System/site | Site admin | Available to guests and users |
| Private library | User | Owning user | Saved to the user’s library |
| Guest draft | NA | Current guest | Exists only in the browser session |

A user must copy a public chart into their library before editing it. The private copy is independent of the catalog chart.

### Chord-change variant

A chord-change variant is for alternative approaches to a song's harmony. It may apply to one or more measures in a chart. 

A variant should have:

- Measure range
- Chord content
- Optional notes

Use variants when the melody, lyrics, meter, and overall chart identity remain the same and the variants are minor to the song. Use a separate chart when the arrangement is drastically different, such as a different meter, form, melody, or full-song treatment.

### Set list

A set list is an ordered collection of charts owned by a user. 

Users can only see their own lists.

A set list cannot directly contain a public catalog chart. The user must copy the chart to their library first.

### Display settings

Display settings are current presentation choices, not changes to the chart’s underlying content. They include:

- Transposition
- Visible melody
- Visible chords
- Visible lyrics
- Playback tempo
- Selected chord-change variants

The display settings are also used for the downloads. 

## Relationships

```text
Public catalog
└── Public chart

User library
├── User chart
|   ├── Chord-change variants
|   └── Set-list references
└── User set list

Guest session
└── Temporary chart draft (in browser memory only)
```

## Storage model

Most of the data in the chart is stored in an ABC content field. Other fields are for tasks that make the system run smoother or give metadata crucial to the app that aren't appropriate in an ABC file. 

Use one source of truth for each kind of data:

| Data | Authority |
|---|---|
| Ownership, visibility, tags, writers, title, subtitle, publication year | Structured chart metadata |
| Notation and playable chart body | Stored ABC content in the chart record |
| Current display choices | Browser/session state, or set-list item when intentionally saved |
| MusicXML, PDF, PNG, SVG, and ABC files | Generated from the current chart and display settings |

The database record is the source of truth. An ABC download is a portable serialization of that record, not a second independently edited copy.

ABC is the portable chart format; a collection is a ZIP containing ABC files. Import, download, and bulk-download workflows and priorities are defined in the [requirements](../../local/docs/product/REQUIREMENTS.md#requirements).

## Important invariants

- A user cannot modify a public chart directly.
- A library copy will not modify its source chart, it is totally separate at the point of duplication.
- A guest draft is never presented as permanently saved.
- A set list references a user-owned chart, not a public catalog chart.
- A private chart can contain content that the admin has never reviewed.
- Removing a user chart from a user’s library will not remove the public chart that was used as its source.
- No edit-history model is required.
