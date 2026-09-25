# MyFakebook Context

MyFakebook is a digital fakebook for musicians. Each saved song has one owner and one publication state. The public library shows published songs; each owner’s My Library shows all of their songs.

## Product documents

- [Content model](docs/product/CONTENT_MODEL.md): song concepts, fields, ownership, relationships, storage authority, and invariants.
- [Requirements](local/docs/product/REQUIREMENTS.md): scope, user workflows, priorities, and acceptance criteria.

## Language

**Song**:
A lead-sheet arrangement with its own title, notation, and metadata. A materially different arrangement is a separate song.
_Avoid_: Chart, score, work

**Public library**:
The collection view of published song records, visible to guests and users.
_Avoid_: Public catalog, catalogue

**My Library**:
An owner’s collection of their private and published songs, visible only to that owner.
_Avoid_: Private library, My Songs, personal catalog

**Public song**:
A song record in the published state. It appears in the public library and remains in its owner’s My Library.
_Avoid_: Catalog chart, public chart

**Private song**:
A song record in the private state, visible only in its owner’s My Library. Saving another owner’s public song creates an independent record.
_Avoid_: Score, library chart

**Guest**:
A visitor who is not signed in. A guest may experiment with song content in the open workspace and download it; that unsaved work is not retained after refresh.
_Avoid_: Anonymous user

**Set list**:
A user-owned ordered collection of private songs.
_Avoid_: Playlist

**Chord changes**:
The ordered harmony assigned to measures or positions in a song.
_Avoid_: Chord version

**Chord-change variant**:
An alternative set of chord changes for part or all of a private song.
_Avoid_: Alternate song, playlist

**Display settings**:
Presentation choices such as transposition and visible parts; they do not rewrite song content.
_Avoid_: Song edits
