# MyFakeBook

A tool for musicians to write, organize, edit, and export lead sheets. Built with Next.js. Authentification is handled by Clerk. Data is handled by Convex.

## Start locally

```bash
npm ci
npm run dev
```

## npm commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Install the exact dependency versions in the lockfile |
| `npm run dev` | Start the Next.js development server with live reload |
| `npm run build` | Compile the production application using webpack |
| `npm start` | Serve a completed production build; run `npm run build` first |
| `npm run lint` | Run ESLint to check the code for lint errors |
| `npm test` | Run the Vitest test suite once |
| `npm run test:watch` | Run Vitest in watch mode and re-run tests while editing |
| `npm test -- path/to/file.test.ts` | Run one test file |
| `npm run typecheck` | Generate Next.js route types, then check TypeScript without emitting files |
| `npm run check` | Run lint, type generation/type checking, and tests in sequence; stop if a step fails |
| `npm run icons` | Regenerate PWA, Apple touch, maskable, and favicon images from `public/icons/icon.svg` |
| `npm run db:export:prod` | Export the production Convex database to a timestamped ZIP in `local/exports/` |
| `npm run db:import:dev` | Copy songs from the newest ZIP in `local/exports/` into the development Convex database as private songs with new IDs |
| `npm run viewer` | Start the Ladle component viewer for local development |
| `npm run viewer:build` | Build a static version of the Ladle component viewer |
| `npm run viewer:preview` | Preview the built Ladle component viewer locally |

### Database command options

The export uses your Convex login or a production `CONVEX_DEPLOY_KEY`. Existing output files are never overwritten. Pass `--path <file.zip>` to choose the output, `--env-file <file>` to select credentials, or `--include-file-storage` to include uploaded files.

The import requires `unzip`, a Convex CLI login, and a development deployment configured as `CONVEX_DEPLOYMENT=dev:<deployment-name>` in `.env.local`. Set `DEV_CLERK_USER_ID` in that file or pass `--owner user_...` to assign the copied songs. It imports songs only; repeated runs append additional copies.

| Option for `npm run db:import:dev --` | Purpose |
| --- | --- |
| `--path <file.zip>` | Import from a specific export instead of the newest ZIP |
| `--owner <user_...>` | Assign copied songs to this development Clerk user |
| `--source-owner <id>` | Copy only songs belonging to this production owner |
| `--env-file <file>` | Read development settings from a file other than `.env.local` |
| `--dry-run` | Show the source, destination, and song count without connecting to Convex |
| `--replace` | Replace **all development songs, across all owners**, with the selected copies; keep original creation times but generate new IDs. Binder items referencing removed songs may become dangling |

Use `npm run db:export:prod -- --help` or `npm run db:import:dev -- --help` for the full usage. For example, preview an import before copying songs:

```bash
npm run db:import:dev -- --owner user_... --dry-run
```

## Public-domain songs and published binders

Non-admin users create songs and binders for themselves. Only admins can classify
songs as public domain or publish their own binders. Song creation always starts
private; adding a song to a published binder never changes that song's access.

Songs use `publicDomainTerritory`: `none` (creator only), `US` (US visitors and the
creator), or `worldwide` (everyone). Binders use `published`, defaulting to false.
Published binders are available to signed-out visitors at `/binders` and
`/binders/[id]`. Their public views and counts omit inaccessible songs entirely.
A US-only binder is empty outside the US. Owners retain all their binder entries.

Regional access uses Vercel's `x-vercel-ip-country` header. Set the same
server-only `PUBLIC_CATALOG_ACCESS_KEY` in Next.js and Convex. Do not prefix this
key with `NEXT_PUBLIC_`. Unknown countries or an unavailable regional service
fall back to worldwide access only. For local US testing, set
`LOCAL_PUBLIC_CATALOG_COUNTRY=US` in development. Country values from browser
request bodies and query parameters do not grant regional access.

### Rolling migration

Deploy the Convex compatibility schema/functions before deploying the Next.js
changes. Existing song publication fields remain readable and are kept in sync
for compatibility; the new admin UI writes through `songs:setPublicDomain`.
Existing binders without a `published` field are treated as unpublished.

After deployment, backfill in batches using the Convex dashboard or CLI:

```bash
npx convex run songs:migratePublicDomainStatus '{"cursor":null}'
npx convex run binders:migratePublication '{"cursor":null}'
```

For each function, pass the returned `cursor` into the next call until `done`
is true. Both migrations are safe to rerun. Use the appropriate deployment
selection when running these commands; no migration is run automatically.
Existing private data remains private throughout the rollout. Development
imports reset both legacy publication fields and public-domain status to private.
