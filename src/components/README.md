# Component map

- `app-shell/` contains application providers and the shared site header.
- `library/my-library/` contains the signed-in user's library screens and sidebar.
- `library/public-library/` contains the public song catalog and publishing controls.
- `songs/editor/` contains the ABC notation editors.
- `songs/preview/` contains notation preview and playback.
- `songs/workspace/` composes the editor, preview, library, and persistence into route-ready song workspaces.
- `set-lists/` contains set-list screens and song actions for set lists.
- `songs/types.ts` holds song data shared across these features.
- `shared/` holds presentation styles reused by song action controls.

Most component styles and behavior tests live beside the component they cover. Song action controls share the stylesheet in `shared/`. The set-list folder exports its route-level components from `index.ts`.
