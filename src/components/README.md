# Component map

- `app-shell/` contains application providers and the shared site header.
- `library/my-library/` contains the signed-in user's library screens and sidebar.
- `library/public-library/` contains the public song catalog and publishing controls.
- `songs/editor/` contains the ABC notation editors.
- `songs/preview/` contains notation preview and playback.
- `songs/workspace/` composes the editor, preview, library, and persistence into route-ready song workspaces. `song-workspace.tsx` owns working-song state; `use-song-export.ts` owns download behavior.
- `binders/` contains binder screens and song actions for binders.
- `../lib/songs/types.ts` holds song data shared across these features.
- `shared/` holds presentation styles reused by song action controls.

Most component styles and behavior tests live beside the component they cover. Song action controls share the stylesheet in `shared/`. The `binders/` folder exports its route-level components from `index.ts`.

Use `ui/` for reusable controls without song or persistence knowledge. Feature-specific hooks stay with their feature. Shared non-React logic belongs in `src/lib/`; see [the architecture guide](../../docs/architecture.md).
