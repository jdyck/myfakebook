# MyFakebook

MyFakebook is a Next.js App Router workspace for writing, organizing, viewing, and exporting online lead sheets.

## Product documentation

The product requirements, content model, decision log, backlog, and roadmap live in [`local/docs/product`](local/docs/product/README.md). The project vocabulary is recorded in [`CONTEXT.md`](CONTEXT.md).

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
2. In the same Clerk development instance, enable the Convex integration under Configure → Integrations.
3. Run `npx convex dev` and follow the prompts to create/link a Convex deployment.
4. Set `CLERK_JWT_ISSUER_DOMAIN` to that Clerk instance's issuer domain in both `.env.local` and the Convex development deployment:

   ```bash
   npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-clerk-frontend-api-url.clerk.accounts.dev
   ```

5. Add the generated Convex URL to `.env.local`, then run `npm run dev` again.

## Vercel and Tailwind CSS

The project is configured for Vercel deployment and includes Vercel Web Analytics. Link the local project once, set the Clerk and Convex variables from `.env.example` in the Vercel project settings, and enable Web Analytics in the Vercel dashboard:

```bash
npm run vercel:link
npm run vercel:deploy
```

Use `npm run vercel:dev` to run the app through the Vercel development environment. The app uses Tailwind CSS v4 directly through `src/app/globals.css`.

Convex functions live in `convex/`. Generated files in `convex/_generated/` are intentionally committed because the app imports their types.

## Export flow

`POST /api/musicxml` accepts `{ "abc": "..." }` and returns a downloadable MusicXML 4.0 document. The converter supports common ABC 2.1 headers, key signatures, meters, tempos, notes, rests, chords, repeats, ties, broken rhythms, and inline harmony names.

## Song content

Songs store structured content in this format:

```json
{
  "meter": "3/4",
  "unitLength": "1/4",
  "measures": [
    {
      "chords": [["F", 2], ["C7", 1]],
      "melody": "d2 A",
      "lyrics": "Toy- land!"
    }
  ]
}
```

Each chord is a `[name, duration]` pair. Durations are positive multiples of `unitLength`, so `2` above means two quarter notes. Chords run consecutively from the start of the measure; an empty chord name represents a gap. Melody and lyrics use ABC syntax within each measure.

The object is the source of truth. Loading uses `content` first; if it is blank (absent, null, `{}`, or no measures), it falls back to inline `abc`, then to separate-parts `abcParts`. ABC imports build the object, which is persisted on the next save. Inline ABC and separate-parts ABC are kept alongside it for compatibility and notation layout.

The editor has four synchronized tabs: **Inline chords**, **Easy**, **Separate parts**, and **JSON**. Easy provides aligned rows for chords, melody, and lyrics. Inline ABC feeds engraving, playback, and exports. The separate-parts tab uses `%%staves (chords melody)`, `V:chords`, and `V:melody`, with timed `x` spacers for chords. Valid edits in any tab update the same object and preview. Incomplete JSON or unmatched voice durations stay in the editor while the last valid song remains in the preview. Copy and Format apply to the selected tab.
