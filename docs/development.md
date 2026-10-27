# Development and deployment

## Local editor

Run `npm ci` and `npm run dev`. With no credentials, `/new` supports editing, preview, playback, and downloads. Guest work is not retained after refresh. The public library needs a configured Convex deployment to contain saved songs.

Use a Node.js version supported by the installed Next.js package. CI runs on Node.js 24. Dependencies are pinned through `package-lock.json`; commit lockfile changes with dependency changes.

## Authentication and persistence

1. Copy `.env.example` to `.env.local` and replace the Clerk key placeholders with keys from your development Clerk application. Leave unused variables unset rather than using example values.
2. In that Clerk instance, enable the Convex integration under Configure → Integrations.
3. Run `npx convex dev` to create or link a development deployment. Keep it running in a second terminal while working on database functions.
4. Set `CLERK_JWT_ISSUER_DOMAIN` to the Clerk instance's issuer domain in `.env.local` and in the Convex deployment:

   ```bash
   npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-clerk-frontend-api-url.clerk.accounts.dev
   ```

5. Put the generated Convex URL in `NEXT_PUBLIC_CONVEX_URL` in `.env.local`, then restart Next.js.

Clerk authenticates users. Convex enforces ownership and publication permissions; hiding a UI control does not provide authorization. Admin publication controls require Clerk public metadata `role: "admin"`.

For the regional public library, configure the same server-only `PUBLIC_CATALOG_ACCESS_KEY` in Next.js and the Convex deployment. The API uses Vercel's request country, with an optional development-only `LOCAL_PUBLIC_CATALOG_COUNTRY=US` override. Without the regional configuration, the API uses the worldwide library. `CONVEX_SITE_URL` can override the HTTP-action URL otherwise derived from `NEXT_PUBLIC_CONVEX_URL`.

## Styling

Tailwind CSS v4 runs through `@tailwindcss/postcss` in `postcss.config.mjs`. Its theme and utilities are imported in `src/styles/globals.css`, with class detection scoped to `src/`. The existing base reset and CSS Modules remain in place; Tailwind utilities are layered after component styles.

Use utility classes directly in component `className` values, for example `className="flex gap-4 border border-line bg-paper p-4 font-sans text-ink"`. Theme colors such as `bg-canvas`, `text-muted`, and `text-accent` follow the app's light/dark variables. Fonts are available as `font-sans` (Inter), `font-mono` (Roboto Mono), and `font-display` (Roboto Flex). The `dark:` variant follows the existing `data-theme="dark"` toggle. Use complete class names so Tailwind can detect them; avoid building class names with string fragments.

Use square corners throughout the app and component viewer: controls, menus, panels, and badges must have zero border radius. Do not add rounded corner utilities or nonzero radius values.

Shared design tokens are defined in `src/styles/globals.css`. Use the same variables in CSS Modules, so utilities and component styles share one source of truth.

| Purpose | Utilities / tokens |
| --- | --- |
| Theme surfaces, text, borders, and states | `bg-paper`, `text-ink`, `border-line`, `text-destructive`, `text-on-accent` |
| Fixed brand colors | `bg-brand`, `hover:bg-brand-hover`; use `accent` for the local theme's accent |
| Library and workspace palette | `bg-editorial-canvas`, `text-editorial-ink`, `border-editorial-line`; existing shells alias their local colors to these tokens |
| Score rendering | `bg-score-paper`, `text-score-ink`, `text-score-muted`, `border-score-line`, `bg-score-surround`; the score stays white in dark mode |
| Text selection | `selection:bg-selection selection:text-selection-ink` |
| Dense typography | `text-micro` (9px), `text-caption` (10px), `text-compact` (11px), `text-code` (11.5px), `text-xs` (12px), `text-detail` (13px) |
| Intermediate font weight | `font-semibold` (650) |
| Shared radii | `rounded-control`, `rounded-field`, and `rounded-menu-item` are all zero |
| Control sizes | `size-control` / `min-h-control` (34px), `min-h-field` (38px), `min-h-touch` (44px) |
| Page width and menu elevation | `max-w-page` (1600px), `shadow-menu` |
| Control transitions | `duration-control` (160ms) |

Theme-aware colors use `@theme inline` mappings to light/dark variables. Fixed shared values use `@theme static` so their CSS variables remain available to CSS Modules even without a matching utility in JSX. Standard spacing and type sizes continue to use Tailwind's built-in scale. Keep one-off layout dimensions and responsive adjustments beside their components; add a token when it represents a shared design decision.

### Shared stylesheet consumer contract

Import `src/styles/globals.css` once from the consumer entry point (the app does this in its root layout). This is the shared entry point for the Ladle viewer, with no dependency on Next.js or application providers. Process it with the existing Tailwind v4 PostCSS plugin and support CSS Modules for component imports. Do not add another reset/Preflight or copy the tokens.

The utilities import uses `source("../")`, relative to `src/styles/globals.css`, so detection still covers `src/` after the move from `src/app/`. Stories outside `src/` will need an explicit Tailwind source registration. The Bravura font URLs also retain their meaning (`../../node_modules/`); the consumer bundler must resolve and serve those font assets.

Consumers must load fonts and define these inherited CSS variables on the document root before rendering components:

| Variable | Font / role |
| --- | --- |
| `--font-inter` | Inter; body text and `font-sans` |
| `--font-roboto-mono` | Roboto Mono; code and `font-mono` |
| `--font-roboto-flex` | Roboto Flex; headings and `font-display` |

Use font-family stacks as the variable values. Load the same variable fonts for application fidelity; deliberate fallback stacks can be used for a viewer but will change text metrics. The application continues to load these through `next/font/google` in `src/app/layout.tsx`; a viewer must supply its own font loading without importing the Next.js layout.

Light tokens are defined on `:root`. For dark mode, set `data-theme="dark"` on the consumer document's `<html>` element; remove it or use `data-theme="light"` for light mode. This drives both theme variables and the Tailwind `dark:` variant, including portaled content. There is no automatic system-theme media query in this stylesheet.

The application-specific `src/app/layout.module.css` remains responsible for the document canvas background, body minimum height, body font/ink, and selection colors. A viewer should apply equivalent shell styling using `--canvas`, `--font-inter`, `--ink`, `--selection`, and `--selection-ink` (including the canvas background on `<html>`). Keep these consumer shell choices separate from the shared token definitions.

## Component viewer

Run `npm ci` then `npm run viewer` to start Ladle (default port 61000).
Run `npm run viewer:build` for the static production viewer in ignored `build/`;
`npm run viewer:preview` serves that output on port 8080 (build it first).
No credentials or backend are needed.

The viewer also covers score previews with display controls, zoom, fullscreen,
and export menus; binder lists and details; public-library collections and
territory labels; Add to Binder dialogs; and publication selection. Binder
examples support local creation, renaming, adding/removing songs, reordering,
and display settings. Error stories fail their local callbacks on interaction;
Add to Binder's Saving example stays pending after selecting a destination.
Use the narrow score preview and Ladle's viewport tools to check mobile layouts.
Preview export callbacks report the selected format without downloading a file.

Examples cover Button variants/sizes, editable and unavailable TextFields,
controlled Selects, DisplayControls with live settings and transposed heading,
SongHeading publication states, and HeaderView guest/signed-in navigation states.
Header stories use fixture account controls; use Ladle’s theme and viewport tools
to inspect dark mode and mobile layouts. Narrow stories use the sidebar layout.

`.ladle/components.tsx` imports the shared stylesheet and locally bundled variable
Inter, Roboto Mono, and Roboto Flex fonts, independently of `next/font`. Its
provider maps Ladle's theme to `<html data-theme>` so body portals inherit it,
and restores the previous attribute and viewer shell class on cleanup. It does
not mount application providers, authentication, analytics, or a service worker.

Stories use a padded layout by default. Set `Story.meta = { previewLayout:
"sidebar" }` for a 320px-wide padded preview, or `previewLayout: "fullscreen"`
for an unpadded, viewport-height preview (use Ladle's full-screen toggle to hide
the viewer chrome). File-level `meta` works too. Viewer shell styles live in
`.ladle/preview.module.css`; keep stories in `src/` for Tailwind class detection.
Ladle uses the existing PostCSS config and built-in TypeScript path support.
`.ladle/config.mjs` selects `.ladle/vite.config.mts` only for the viewer;
`vitest.config.mts` stays separate.

### Adding a story

Colocate a `component-name.stories.tsx` file with its component under
`src/components/`; `.ladle/config.mjs` explicitly discovers
`src/components/**/*.stories.{ts,tsx}`. Export named components typed as
`Story` from `@ladle/react`:

```tsx
import type { Story } from "@ladle/react";
import { SongHeading } from "./song-heading";
import { songHeadingFixtures } from "./song-heading.fixtures";

export const Private: Story = () => <SongHeading {...songHeadingFixtures.private} />;
Private.meta = { previewLayout: "sidebar" };
```

Omit `previewLayout` for padded controls, use `sidebar` for narrow controls,
and `fullscreen` for page compositions. Keep interactive state inside the story
(as in DisplayControls and Select) and pass callbacks to the component.

Keep deterministic, typed props in colocated `*.fixtures.ts` files; shared song
samples belong in `src/components/story-support/song-samples.ts`. Reuse these
fixtures rather than fetching data or using real user records. Include useful
empty, loading, long-content and populated states where applicable.

For connected components, render the presentation boundary with fixture props
instead of the `*-backed` wrapper or route. For example, MyLibraryList owns list
interaction while MyLibraryListBacked owns Clerk/Convex integration. Do not add
live providers or credentials to make a story render. Authentication, persistence,
server rendering, and real navigation remain application/integration concerns.

The viewer uses Vite, not the Next.js build pipeline. `@/` resolves through
`tsconfig.json`; CSS Modules and the root PostCSS/Tailwind configuration are
processed by Vite. Fonts are bundled locally, and `public/` assets are copied to
`build/` with their root-relative URLs, so serve the production viewer at the
host root. `build/` is already ignored. CI runs `npm run viewer:build` after
`npm run check`; the latter retains lint, type checking and unit tests only.
Rebuild and preview after changes to aliases, CSS, fonts or assets; a development
server alone does not verify production bundling.

### Next.js in examples

SongHeading has unsaved and transposed published examples. Its metadata helper
uses `abc-display` and `abcjs`; its song types have only type-level Convex imports.
EditorialLibraryView has separate empty, loading, and populated examples using
local fixtures. The populated example supports search (including no results and
Clear filters), visibility filters, and sorting, with a long-title row. It
deliberately omits the connected Header (covered separately through HeaderView)
and uses the viewer’s bundled fonts. No AppProviders, Clerk or Convex connections
are mounted.
The caption uses the viewer's bundled Inter font rather than Roboto Condensed.

Binder and public-library stories import `BindersListView`, `BinderDetailView`,
`SaveToBinderView`, and `PublicSongsListView` directly. Their application wrappers
retain Clerk, Convex, router navigation, and Next.js font loading. The views take
local data and async callbacks; story mutations update fixture state rather than
calling the backend. `PublicationSelect` exposes the same control used by the
admin wrapper, while permission checks remain in the connected component.

Following [Ladle's Vite configuration guidance](https://ladle.dev/docs/config/),
the viewer aliases exactly `next/link` and `next/image` to `.ladle/next/` adapters.
Application imports and navigation remain unchanged. These adapters support only
the API used by these examples:

- [Link](https://nextjs.org/docs/app/api-reference/components/link): string `href`,
  children and anchor attributes. Links show their intended destination in a
  tooltip; activation announces and displays it without leaving the story.
  The actual anchor is `#`, so opening it in another tab stays in the viewer.
  No prefetch, router, history, object hrefs or Next navigation options are
  implemented. The view's native skip link still jumps to its main content.
- [Image](https://nextjs.org/docs/app/api-reference/components/image): local
  string sources, alt text, width/height, sizes, styles and absolute `fill`
  positioning. Assets come from `public/`, including the production build.
  There is no image optimization, generated srcset, static-import handling,
  blur placeholder or custom loader. `sizes` is preserved but has no selection
  effect without srcset.

There is no general Next.js shim, router context or font-loader integration.
Add a small renderable boundary or extend compatibility deliberately before
adding examples that need other framework APIs.

## Checks

Run `npm run check` before submitting changes. It runs ESLint, `next typegen`, TypeScript, and Vitest. Tests sit beside the code they cover; DOM tests opt into jsdom, and backend tests use `convex-test` without a live deployment. When interacting with a menu in a React test, finish the opening `act` before querying its portaled options.

Run `npm run build` to validate production bundling. The root layout uses `next/font/google`, so building requires access to Google Fonts. Browser downloads and audio also deserve a manual check when their behavior changes.

## Import production songs into development

Add `DEV_CLERK_USER_ID=user_...` to `.env.local`, using the user ID from the
**development** Clerk dashboard's Users page. This must match the account you
sign into locally; production and development Clerk IDs differ. No additional
secret key is needed. Keep the `CONVEX_DEPLOYMENT=dev:...` setting written by
`npx convex dev`, and log into the Convex CLI with `npx convex login`.

```bash
# Preview the latest ZIP in local/exports/ without connecting to Convex.
npm run db:import:dev -- --dry-run
# Append the copies to development.
npm run db:import:dev
# Replace all development songs with the selected export's songs.
npm run db:import:dev -- --replace --dry-run
npm run db:import:dev -- --replace
# Optionally choose a ZIP and copy only one production user's songs.
npm run db:import:dev -- --path local/exports/my-backup.zip --source-owner user_PRODUCTION_ID
```

The script selects the ZIP with the newest modification time, reads only
`songs/documents.jsonl`, and assigns every selected song to `DEV_CLERK_USER_ID`
(or `--owner user_...`). Without `--source-owner`, it copies **all** exported
songs. Copies are private, with new IDs and creation times, and no publication
or catalog identity. Notation, titles, writers, rhythms, and update times remain.
Binders, other tables, and uploaded files are not imported. Existing development
records remain; **repeating an import creates additional copies**.

Use `--replace` to replace the **entire development songs table, across all
owners**, instead of appending. It preserves the export's `_creationTime`
and `updatedAt`, and generates new development IDs. Production IDs can embed table
numbers that conflict with unrelated development tables, so they are removed.
Ownership still changes to your development user, and copies
remain private without publication metadata or catalog IDs. Convex performs
the table replacement atomically; the script does not clear records in a separate
step. An empty selection is refused. Repeating replacement resets the table
without accumulating copies, but generates new IDs each time. With `--source-owner`, only that owner's
exported songs survive the replacement. Other tables are untouched, so existing
binder items referencing previous song IDs become dangling.
This is a song reset, not a full database restore. `--replace` skips the CLI's
deletion confirmation; use `--dry-run` to review the source, destination and count.

It requires `unzip` (included with macOS) and accepts `--env-file <file>` for an
alternate development settings file. Only a `dev:` deployment is accepted. The
CLI receives an isolated selection file and no `CONVEX_*` shell variables, so
production deploy keys cannot override the destination. It uses your Convex CLI
login, not a deploy key. Temporary private data files are removed when it exits.
The ZIP remains unchanged. See [Convex data import](https://docs.convex.dev/database/import-export/import)
for the underlying append and ID behavior.

## Deployment

### Export the production database

Run `npm run db:export:prod` to save a production snapshot to
`local/exports/production-<timestamp>.zip` (ignored by Git). It uses the installed
Convex CLI with `--prod`, your linked project's configuration, and your Convex
login. Run `npx convex login` first if needed. The export reads database data;
it does not deploy code or change records.

```bash
npm run db:export:prod
npm run db:export:prod -- --path local/exports/my-backup.zip --include-file-storage
npm run db:export:prod -- --env-file .env.production.local
```

For a separate production connection, put `CONVEX_DEPLOY_KEY=<production deploy key>`
in the ignored `.env.production.local` file and use the last command. Create the
key in the production deployment's Convex dashboard settings. A deployment key
overrides `--prod`, so use a **production** key and remove any development or
preview deploy key from your shell environment before running. Never commit keys
or snapshots; custom output paths should also be outside tracked directories.

The ZIP contains table data as `<table>/documents.jsonl`, preserving document IDs
and creation times. Add `--include-file-storage` to include uploaded file contents.
Existing output files are refused. Treat the archive as private production data.
This exports Convex data, not Clerk accounts, environment variables, or app code.
See the [Convex export guide](https://docs.convex.dev/database/import-export/export).

The app is configured for Vercel in `vercel.json` and includes Vercel Web Analytics. Connect the repository in Vercel, configure production Clerk and Convex environment variables, and enable Web Analytics there. Deploy the Convex backend with `npx convex deploy` and ensure its issuer and regional library secret match the frontend environment. Before deploying to an older deployment, verify that its set list data has already been copied to `binders` and `binderItems` and no copy migration jobs remain scheduled. The copy migration is available in the previous revision. Removing `setLists` and `setListItems` from the schema leaves their deployed data intact; after verifying the copy and taking a backup, delete the old tables separately in the Convex dashboard. Legacy ID mappings remain on binders and items to preserve saved links.

The built-in catalogue bootstrap and `catalogImports` tracking table have been retired. Songs already imported remain ordinary song records; admin sign-in no longer imports sample songs. The retained `catalogImports` table can be deleted separately in the Convex dashboard after taking a backup.

Convex regenerates `convex/_generated/` during development and deployment. Those files are committed because application code imports them; regenerate them rather than editing them manually.

## Home screen installation (PWA)

The root layout links `/manifest.webmanifest`, with standalone display, home screen icons, and Apple web app metadata. On Android, use the browser's **Install app** or **Add to Home screen** menu. On iPhone and iPad, open the app in Safari, choose **Share → Add to Home Screen**, then **Add**. The installed app opens at `/` and keeps the existing guest/signed-in redirect behavior.

Installation requires HTTPS in deployment (localhost also works for local checks). Test the service worker with `npm run build` and `npm start`; registration is disabled in development to avoid interfering with hot reload. In browser developer tools, check the Application panel for the manifest, icons, and active `/sw.js` worker. Install the app, launch it from the home screen, and check that it opens without browser controls. After one online visit with the worker active, switching offline and reloading should show the offline screen; **Try again** retries the same URL.

The worker caches only `/offline.html`. Song data, authenticated pages, API responses, and Next.js payloads remain network-only; installing does not enable offline editing or retain unsaved guest work. The worker uses its own versioned cache and removes only older caches with that prefix. When changing the offline screen, bump `CACHE_NAME` in `public/sw.js`. The icon source is `public/icons/icon.svg`. Run `npm run icons` after changing it to regenerate the 192px/512px PNGs, 180px Apple touch icon, 512px maskable icon, and `src/app/favicon.ico`. Raster icons use a white background; the maskable export includes 64px padding on each side to preserve the launcher safe zone. The favicon packages 32px and 48px RGBA (32-bit) PNGs, as required by Turbopack.

## Local-only files

Keep credentials in ignored `.env.local`. Use ignored `local/` for scratch files, personal plans, and experiments. Shared setup instructions and design decisions belong in tracked `docs/` so a fresh checkout has them.
