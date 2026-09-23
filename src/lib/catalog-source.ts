import type { PublicCatalogChart } from "./public-catalog";

export function selectPublicCatalog(
  databaseCatalog: readonly PublicCatalogChart[],
  fallbackCatalog: readonly PublicCatalogChart[],
): readonly PublicCatalogChart[] {
  return databaseCatalog.length > 0 ? databaseCatalog : fallbackCatalog;
}
