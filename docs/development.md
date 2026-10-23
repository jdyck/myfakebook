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

## Checks

Run `npm run check` before submitting changes. It runs ESLint, `next typegen`, TypeScript, and Vitest. Tests sit beside the code they cover; DOM tests opt into jsdom, and backend tests use `convex-test` without a live deployment. When interacting with a menu in a React test, finish the opening `act` before querying its portaled options.

Run `npm run build` to validate production bundling. The root layout uses `next/font/google`, so building requires access to Google Fonts. Browser downloads and audio also deserve a manual check when their behavior changes.

## Deployment

The app is configured for Vercel in `vercel.json` and includes Vercel Web Analytics. Connect the repository in Vercel, configure production Clerk and Convex environment variables, and enable Web Analytics there. Deploy the Convex backend with `npx convex deploy` and ensure its issuer and regional library secret match the frontend environment. Follow [the binder migration guide](binder-migration.md) for existing deployments.

Convex regenerates `convex/_generated/` during development and deployment. Those files are committed because application code imports them; regenerate them rather than editing them manually.

## Local-only files

Keep credentials in ignored `.env.local`. Use ignored `local/` for scratch files, personal plans, and experiments. Shared setup instructions and design decisions belong in tracked `docs/` so a fresh checkout has them.
