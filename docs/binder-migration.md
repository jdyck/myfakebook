# Copy set lists to binders

`convex/migrations.ts` adds the internal mutation `migrations:copySetListsToBinders`.
It copies `setLists` to `binders`, then `setListItems` to `binderItems`, in pages of
100 records. Each page schedules the next page transactionally. The source tables
and their existing API remain available during the transition.

The copy preserves owners, names, `updatedAt`, song references, positions, and
optional display settings. Convex assigns new `_id` and `_creationTime` values.
`legacySetListId` and `legacySetListItemId` record the mappings; item `binderId`
values reference the newly created parents. The binder API uses the mapping to
resolve old saved links, including song links with the old item IDs.

## Run

1. Pause writes from the old app, including song removal, for the duration of the
   copy. Keep the new frontend offline until the copy is complete. This is a
   one-time copy, not ongoing synchronization between the old and new tables.
2. Deploy the schema and functions to the intended Convex deployment. For local
   development, use `npx convex dev --once`. For production, use the project's
   normal Convex deployment workflow.
3. Start the migration on that deployment:

   ```bash
   npx convex run migrations:copySetListsToBinders '{}'
   ```

   For production, add `--prod` to the run command.
4. Follow the Convex function logs and scheduled functions. The initial command
   returns the first page's result; subsequent pages continue in the background.
   Completion is logged as `Binder migration` with `phase: "items"` and
   `done: true`. Check that no scheduled migration functions failed or remain
   pending.
5. Before enabling the new frontend, compare source and destination record counts
   in the dashboard and check representative binders for ownership, ordering, and
   saved display settings. Existing destination records without legacy IDs are
   new binders/items and should be excluded from the copy counts.
6. Deploy the frontend that uses `api.binders` and resume access.

If interrupted, restart the command with `{}`. Indexed legacy IDs let it skip
existing copies without overwriting edits or duplicating records. Run or restart
the migration only during the cutover window, before users can delete migrated
binders or items; deleted copies would otherwise be recreated from the retained
source. A missing parent stops the item page with an error rather than silently
dropping its data. Fix the source or restart from the default binder phase.

Keep the old tables until the copy has been verified. They are a retained source,
not a live rollback mirror after the new app starts receiving writes.
