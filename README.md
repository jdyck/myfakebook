# MyFakebook

MyFakebook is a Next.js App Router workspace for writing, organizing, viewing, and exporting online lead sheets.

## Stack

- Next.js 16 + React 19
- Clerk for authentication
- Convex for authenticated chart persistence
- abcjs for live engraving and browser playback
- A small server-side ABC → MusicXML converter for portable exports

## Run locally

```bash
npm install
npm run dev
```

The editor works without credentials and saves drafts to local storage. To enable Clerk and Convex:

1. Copy `.env.example` to `.env.local` and add your Clerk keys.
2. Run `npx convex dev` and follow the prompts to create/link a Convex deployment.
3. Add the generated Convex URL and your Clerk Frontend API URL to `.env.local`.
4. Run `npm run dev` again.

## Vercel and shadcn/ui

The project is configured for Vercel deployment and includes Vercel Web Analytics. Link the local project once, set the Clerk and Convex variables from `.env.example` in the Vercel project settings, and enable Web Analytics in the Vercel dashboard:

```bash
npm run vercel:link
npm run vercel:deploy
```

Use `npm run vercel:dev` to run the app through the Vercel development environment. shadcn/ui is configured for Tailwind v4 in `components.json`; add generated components under `src/components/ui` and use the shared `cn` helper from `@/lib/utils`.

Convex functions live in `convex/`. Generated files in `convex/_generated/` are intentionally committed because the app imports their types.

## Export flow

`POST /api/musicxml` accepts `{ "abc": "..." }` and returns a downloadable MusicXML 4.0 document. The converter supports common ABC 2.1 headers, key signatures, meters, tempos, notes, rests, chords, repeats, ties, broken rhythms, and inline harmony names.
