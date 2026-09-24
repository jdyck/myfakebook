# Song library migration record

The table copy from `catalogCharts` to `publicSongs` and `scores` to `privateSongs` was verified on 2026-09-23. The read-only audit found no missing, duplicate, or mismatched canonical rows:

| Deployment | Private songs copied | Public songs copied |
|---|---:|---:|
| Development | 7 | 3 |
| Production | 11 | 29 |

The application now reads and writes only `privateSongs` and `publicSongs`. The legacy API modules, dual writes, migration component, and legacy table definitions have been removed. The old tables still contain their copied rows until they are explicitly deleted in each Convex deployment.

The canonical tables retain `legacyScoreId` and `legacyCatalogChartId` as optional strings so their existing documents continue to validate. Application code does not read or write these historical pointers.

## Delete the old tables

1. Deploy the current Convex code and schema to the development deployment with `npx convex dev --once`, then to production with `npx convex deploy`.
2. In the Convex dashboard, select the deployment, open **Data**, and use the table menu to choose **Delete table** for `scores` and `catalogCharts`. Deleting each table permanently removes its documents and the table itself. The canonical copies were audited before this step.
3. Repeat the table deletion in both development and production, then confirm only `privateSongs` and `publicSongs` remain in the data view.

Convex documents the permanent [Delete table action](https://docs.convex.dev/dashboard/deployments/data). The similarly named **Clear Table** action empties a table but leaves the table in place.
