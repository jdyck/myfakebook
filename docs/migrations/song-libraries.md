# Song library table migration

This is the expand-and-migrate release for the Convex rename. The app uses `publicSongs` and `privateSongs`; it still keeps `catalogCharts`, `scores`, and their old API paths as compatibility storage until the copy is verified.

| Current table | Canonical table | Link field on canonical row |
|---|---|---|
| `catalogCharts` | `publicSongs` | `legacyCatalogChartId` |
| `scores` | `privateSongs` | `legacyScoreId` |

## Rollout

1. Deploy the expanded schema, both API namespaces, compatibility APIs, and the migrations component to the intended Convex deployment. The old tables must remain in the schema.
2. Dry-run each copy migration against that deployment:

   ```sh
   npx convex run migrations:runPrivateSongs '{"dryRun":true}'
   npx convex run migrations:runPublicSongs '{"dryRun":true}'
   ```

   A dry run processes one batch without committing it. The migration runner may report the intentional dry-run stop as an error; confirm the output shows the intended table and copied values.

3. Start or resume the copies:

   ```sh
   npx convex run migrations:runPrivateSongs
   npx convex run migrations:runPublicSongs
   ```

   Each copy is resumable. Do not reset a migration after it has completed unless there is a specific recovery reason.

4. Watch component status:

   ```sh
   npx convex run --component migrations lib:getStatus --watch
   ```

5. Run the read-only row audit:

   ```sh
   npx convex run migrations:auditSongLibraries
   ```

   Its `processed` totals should match the legacy table row counts in the Convex dashboard. `missingCanonical`, `duplicateCanonical`, and `mismatchedCanonical` must all be zero for both libraries. The audit checks every legacy ID link and compares all persisted fields, including owner or publication status, title, ABC, and timestamps. New writes stay paired atomically while this audit runs.
6. Confirm the Public Library and Private Library screens still load and that edits/removals through both old and canonical API paths stay synchronized.
7. Keep the compatibility release deployed through the agreed old-client grace period. A later contract release can remove old aliases, stop dual writes, and then remove legacy tables and link fields.

The copy is safe to overlap with app traffic because every song mutation writes the old and canonical documents in one Convex transaction. Migration rows are matched by legacy ID, so a migration retry updates the same canonical document instead of creating another one. Public song edits made in the editor remain in browser memory and are not part of either table migration.

For the component behavior and runner options, see the [Convex Migrations component guide](https://www.convex.dev/components/migrations).
