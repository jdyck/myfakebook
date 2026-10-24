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

Tailwind CSS v4 runs through `@tailwindcss/postcss` in `postcss.config.mjs`. Its theme and utilities are imported in `src/app/globals.css`, with class detection scoped to `src/`. The existing base reset and CSS Modules remain in place; Tailwind utilities are layered after component styles.

Use utility classes directly in component `className` values, for example `className="flex gap-4 rounded-lg border border-line bg-paper p-4 font-sans text-ink"`. Theme colors such as `bg-canvas`, `text-muted`, and `text-accent` follow the app's light/dark variables. Fonts are available as `font-sans` (Inter), `font-mono` (Roboto Mono), and `font-display` (Roboto Flex). The `dark:` variant follows the existing `data-theme="dark"` toggle. Use complete class names so Tailwind can detect them; avoid building class names with string fragments.

## Checks

Run `npm run check` before submitting changes. It runs ESLint, `next typegen`, TypeScript, and Vitest. Tests sit beside the code they cover; DOM tests opt into jsdom, and backend tests use `convex-test` without a live deployment. When interacting with a menu in a React test, finish the opening `act` before querying its portaled options.

Run `npm run build` to validate production bundling. The root layout uses `next/font/google`, so building requires access to Google Fonts. Browser downloads and audio also deserve a manual check when their behavior changes.

## Deployment

The app is configured for Vercel in `vercel.json` and includes Vercel Web Analytics. Connect the repository in Vercel, configure production Clerk and Convex environment variables, and enable Web Analytics there. Deploy the Convex backend with `npx convex deploy` and ensure its issuer and regional library secret match the frontend environment. Follow [the binder migration guide](binder-migration.md) for existing deployments.

Convex regenerates `convex/_generated/` during development and deployment. Those files are committed because application code imports them; regenerate them rather than editing them manually.

## Home screen installation (PWA)

The root layout links `/manifest.webmanifest`, with standalone display, home screen icons, and Apple web app metadata. On Android, use the browser's **Install app** or **Add to Home screen** menu. On iPhone and iPad, open the app in Safari, choose **Share → Add to Home Screen**, then **Add**. The installed app opens at `/` and keeps the existing guest/signed-in redirect behavior.

Installation requires HTTPS in deployment (localhost also works for local checks). Test the service worker with `npm run build` and `npm start`; registration is disabled in development to avoid interfering with hot reload. In browser developer tools, check the Application panel for the manifest, icons, and active `/sw.js` worker. Install the app, launch it from the home screen, and check that it opens without browser controls. After one online visit with the worker active, switching offline and reloading should show the offline screen; **Try again** retries the same URL.

The worker caches only `/offline.html`. Song data, authenticated pages, API responses, and Next.js payloads remain network-only; installing does not enable offline editing or retain unsaved guest work. The worker uses its own versioned cache and removes only older caches with that prefix. When changing the offline screen, bump `CACHE_NAME` in `public/sw.js`. The icon source is `public/icons/icon.svg`. Run `npm run icons` after changing it to regenerate the 192px/512px PNGs, 180px Apple touch icon, 512px maskable icon, and `src/app/favicon.ico`. Raster icons use a white background; the maskable export includes 64px padding on each side to preserve the launcher safe zone. The favicon packages 32px and 48px RGBA (32-bit) PNGs, as required by Turbopack.

## Local-only files

Keep credentials in ignored `.env.local`. Use ignored `local/` for scratch files, personal plans, and experiments. Shared setup instructions and design decisions belong in tracked `docs/` so a fresh checkout has them.
