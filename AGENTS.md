<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project organization

Read `docs/architecture.md` for module ownership and dependency rules, and `docs/development.md` for setup and validation. Keep routes thin, feature UI and hooks in `src/components/`, shared non-React logic in `src/lib/`, and persistence and authorization in `convex/`. Keep tests and CSS Modules beside the code they cover. Run `npm run check` before completing changes; run `npm run build` when changing routes, imports, rendering, or configuration.
