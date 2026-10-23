# MyFakebook

A workspace for musicians to write, organize, play, and export lead sheets. Built with Next.js App Router, React, Clerk, Convex, and abcjs; styled with CSS Modules and global CSS.

## Start locally

```bash
npm ci
npm run dev
```

With no environment variables, open `/new` to try the editor and downloads. Guest edits are temporary and disappear on refresh. Authentication, saved songs, and binders require Clerk and Convex; see [development setup](docs/development.md).

## Find your way around

```text
src/app/          Routes, layouts, and HTTP endpoints
src/components/   Feature UI, hooks, styles, and component tests
src/lib/
  notation/       ABC parsing, timing, voice conversion, and display transforms
  songs/          Song content, source resolution, shared types, and seed library
  export/         Browser downloads and SVG/PDF/PNG conversion
convex/           Database schema, authorization, queries, mutations, and migrations
docs/             Architecture, setup, content model, and migration guides
public/           Static assets
local/            Ignored personal notes and experiments
```

Start with the [architecture and change guide](docs/architecture.md) for entry points, dependency rules, and where to put new code. UI details are mapped in [the component guide](src/components/README.md).

## Everyday commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Next.js with live reload |
| `npm run check` | Run lint, route/type generation, type checking, and all tests |
| `npm run test:watch` | Re-run tests while editing |
| `npm test -- path/to/file.test.ts` | Run one test file |
| `npm run build` | Compile the production application |
| `npm start` | Serve a completed production build |

The same `check` command runs in CI. Run `build` when changing routes, imports, rendering, or configuration.

## Documentation

- [Development and deployment](docs/development.md)
- [Architecture and change guide](docs/architecture.md)
- [Song content and editor formats](docs/song-content.md)
- [Product vocabulary](CONTEXT.md)
- [Product content model](docs/product/CONTENT_MODEL.md)
- [Binder migration](docs/binder-migration.md)

Repository conventions for coding agents are in [AGENTS.md](AGENTS.md), including the requirement to read this installed Next.js version's documentation before changing framework code.
