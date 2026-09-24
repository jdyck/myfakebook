# ADR 0001: Song libraries and Convex table migration

- Status: Accepted
- Date: 2026-09-23

## Context

The product has one site-owned collection of published songs and one private collection per user. The current UI and Convex schema call these the public catalog (`catalogCharts`) and user scores (`scores`), which hides the public/private library model and the song as the item in each library.

Renaming the tables changes Convex document IDs. Existing records and already-open clients may still use IDs and function paths from the current schema while data is copied.

## Decision

- Use **Public Library** and **Private Library** for the two collections.
- Use **public song** and **private song** for their items.
- Use `publicSongs` and `privateSongs` as the canonical Convex tables and `api.publicSongs` / `api.privateSongs` as the canonical function namespaces.
- Keep `catalogCharts` / `api.catalog` and `scores` / `api.scores` as compatibility paths during an expand–migrate–contract rollout.
- During the compatibility phase, read from both table generations, deduplicate migrated pairs through legacy-ID links, and write changes to both records atomically.
- Copy old records with the Convex Migrations component. Do not delete old tables or compatibility fields until both migrations complete and verification confirms every legacy record has a matching canonical record.
- After the migration is cleared, stop compatibility writes, keep only canonical reads, then remove legacy APIs, tables, and legacy-ID fields in a later deployment.

## Consequences

- Existing `catalogCharts` and `scores` IDs remain valid during migration; new APIs also accept those IDs until the compatibility phase ends.
- Public songs keep publication status. Only published public songs appear in the Public Library; unpublished public songs remain admin-only.
- A user's edit to a public song remains an unsaved editor copy until the user saves it to the Private Library. That action creates a separate private song.
- The migration is additive and resumable before cleanup. The old records remain available for recovery while the copy is being verified.
- A later contract deployment is required to remove the old schema. Completing a copy alone does not clear the migration.

## Rollout checklist

1. Deploy the expanded schema, compatibility APIs, and dual-read/dual-write behavior.
2. Run a dry run of both table-copy migrations in the target Convex deployment.
3. Run both migrations and wait until Convex reports each as completed.
4. Verify row counts and that each legacy ID links to a canonical song with matching owner/status, title, ABC, and timestamps.
5. Deploy the contract release that removes legacy tables and compatibility code only after verification and the old-client grace period.

The operator commands and verification steps are in [the song library migration runbook](../migrations/song-libraries.md).
