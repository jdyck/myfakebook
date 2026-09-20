# MyFakebook Context

MyFakebook is a digital fakebook for jazz musicians, with an admin-curated public catalog and private user libraries of editable charts.

## Product documents

- [Content model](docs/product/CONTENT_MODEL.md): concepts, fields, ownership, relationships, storage authority, and invariants.
- [Requirements](local/docs/product/REQUIREMENTS.md): scope, user workflows, priorities, and acceptance criteria.

## UI language

| Concept | Preferred language | Avoid |
|---|---|---|
| Chart | “Song” in the UI | Score, file, document |
| User library | “My Songs” in the UI | Playlist, public catalog |
| Public catalog | Public catalog | Public library |
| Guest draft | Guest draft | Language implying permanent saving |
| Chord changes | Chord changes: the ordered harmony assigned to measures or positions in a chart | Chord version |
| Chord-change variant | Chord-change variant | Alternate song, playlist |
| Set list | Set list | Playlist |
