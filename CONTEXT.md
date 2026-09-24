# MyFakebook Context

MyFakebook is a digital fakebook for musicians. It has a site-curated public library and a separate private library for each user.

## Product documents

- [Content model](docs/product/CONTENT_MODEL.md): song concepts, fields, ownership, relationships, storage authority, and invariants.
- [Requirements](local/docs/product/REQUIREMENTS.md): scope, user workflows, priorities, and acceptance criteria.
- [Song library migration decision](docs/adr/0001-song-libraries-and-convex-migration.md): canonical language, migration decision, and cleanup status.

## Language

**Song**:
A lead-sheet arrangement with its own title, notation, and metadata. A materially different arrangement is a separate song.
_Avoid_: Chart, score, work

**Public library**:
The site-curated collection of published public songs, visible to guests and users.
_Avoid_: Public catalog, catalogue

**Private library**:
A user’s own collection of private songs, visible only to that user.
_Avoid_: My Songs, personal catalog

**Public song**:
A site-owned song managed by an admin. It appears in the public library only after publication.
_Avoid_: Catalog chart, public chart

**Private song**:
A song owned by one user. Saving a public song creates an independent private song.
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
