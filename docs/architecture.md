# Architecture and change guide

## Boundaries

`src/app/` adapts URLs and requests to the application. Pages handle route parameters, server-side authentication, redirects, and choosing connected or unconfigured views. Keep editing and collection behavior in components rather than growing page files.

`src/components/` groups UI by feature: application shell, libraries, songs, and binders. Components own React state and interactions; connected wrappers subscribe to Convex. Reusable UI controls live in `ui/`. Keep feature hooks, CSS Modules, and tests beside the UI they support.

`src/lib/` contains non-React logic shared by the frontend, API endpoints, and backend. It must not import components or routes; ESLint enforces that boundary. Modules under `notation/` and `songs/` should remain usable without a browser. Browser-dependent file and image conversion belongs in `export/`.

`convex/` owns persistence, authorization, and migrations. It can use shared song and notation functions through relative imports. Keep exported function names and table names stable unless intentionally migrating the API. Generated API declarations are not an editing surface.

Prefer direct imports from the owning module over creating a project-wide barrel. Use `@/` for frontend imports across features, and relative imports within a small module group. Shared song types belong in `src/lib/songs/types.ts`, not in a component folder.

## Entry points

| Work area | Start here |
| --- | --- |
| Site providers and authentication | `src/components/app-shell/app-providers.tsx`, `src/proxy.ts` |
| Header and theme | `src/components/app-shell/header/` |
| Public library and publication | `src/components/library/public-library/`, `convex/songs.ts` |
| My Library and saving | `src/components/library/my-library/`, `convex/songStore.ts` |
| Working-song state and screen composition | `src/components/songs/workspace/song-workspace.tsx` |
| Connected song loading | `src/components/songs/workspace/*-backed-workspace.tsx` |
| ABC and structured editing | `src/components/songs/editor/` |
| Engraving, note selection, playback | `src/components/songs/preview/abc-preview.tsx` |
| Transposition and visible parts | `src/lib/notation/abc-display.ts` |
| Content normalization and legacy fallback | `src/lib/songs/song-source.ts`, `song-content.ts` |
| ABC parsing, rows, timing, voices | `src/lib/notation/` |
| Download orchestration | `src/components/songs/workspace/use-song-export.ts` |
| SVG, PNG, PDF, file download mechanics | `src/lib/export/` |
| MusicXML conversion | `src/lib/notation/abc.ts`, `parser.ts`, `musicxml.ts` |
| Binder UI and persistence | `src/components/binders/`, `convex/binders.ts` |
| Schema and validation | `convex/schema.ts`, `convex/validators.ts` |

## Routes and compatibility

| Route | Purpose |
| --- | --- |
| `/` | Redirect guests to the public library, signed-in users to My Library |
| `/new` | Unsaved song workspace |
| `/songs`, `/songs/[id]` | Public library and public song workspace |
| `/mylibrary`, `/mylibrary/[id]` | Owner's library and song workspace |
| `/binders`, `/binders/[id]` | Binder list and detail |
| `/sign-in`, `/sign-up` | Clerk authentication |
| `GET /api/public-songs` | Regional public library with worldwide fallback |
| `POST /api/musicxml` | Convert `{ abc, display? }` to a downloadable MusicXML document |

The product and frontend use **binder**. Existing `/setlists` URLs permanently redirect to `/binders`, preserving the path and query parameters. The `setListId`/`setListItemId` query parameters remain supported for saved song links; song route pages translate them to binder props. The `legacySetListId` and `legacySetListItemId` database fields, `convex/setLists.ts`, and old tables support migration compatibility; see [binder migration](binder-migration.md) before removing them.

## Song data flow

`resolveSongSource` resolves structured content and legacy ABC inputs into `{ content, abc, abcParts }`. The workspace owns the current source, title, selection, and display settings. Editors update this source; the preview renders it with temporary display settings. Library action components call Convex mutations to save or publish. Convex validates inputs and normalizes song content through the same shared functions.

Structured content wins over legacy notation. Display choices such as transposition do not rewrite stored content. See [song content](song-content.md) for format details and [the product model](product/CONTENT_MODEL.md) for ownership invariants.

## Making changes

1. Find the owning module in the table above. Extend its existing responsibility before adding a new folder or abstraction.
2. Keep reusable transformations in `lib/`, feature interactions in a colocated hook, and UI composition in the screen component. Extract a hook when a distinct responsibility needs its own state or lifecycle.
3. Prefer Tailwind utility classes for new UI styling; keep custom CSS Modules and tests beside the code. Shared theme mappings live in `src/app/globals.css`; see [development](development.md#styling). Add behavioral coverage when changing parsing, permissions, persistence, or interactions; file moves should preserve the existing tests.
4. Run `npm run check`; run `npm run build` for route, rendering, or import changes. Update shared docs when a setup step, boundary, or storage invariant changes.

For Next.js-specific changes, read the relevant guide in `node_modules/next/dist/docs/` first, as required by `AGENTS.md`.
