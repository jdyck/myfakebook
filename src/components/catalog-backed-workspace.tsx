"use client";

import { useQuery } from "convex/react";

import { api } from "../../convex/_generated/api";
import { MyFakebookWorkspace } from "@/components/my-fakebook-workspace";
import { selectPublicCatalog } from "@/lib/catalog-source";
import type { PublicCatalogChart } from "@/lib/public-catalog";

type CatalogBackedWorkspaceProps = {
  clerkConfigured: boolean;
  persistenceEnabled: boolean;
  fallbackCatalog: readonly PublicCatalogChart[];
};

export function CatalogBackedWorkspace({
  clerkConfigured,
  persistenceEnabled,
  fallbackCatalog,
}: CatalogBackedWorkspaceProps) {
  const publishedCharts = useQuery(api.catalog.listPublished);

  if (publishedCharts === undefined) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--canvas)] px-6">
        <p className="text-[11px] text-[var(--muted)]" role="status">
          Loading public catalog…
        </p>
      </main>
    );
  }

  const databaseCatalog = publishedCharts.map((chart) => ({
    id: chart._id,
    title: chart.title,
    writers: chart.writers,
    rhythm: chart.rhythm,
    abc: chart.abc,
  }));

  return (
    <MyFakebookWorkspace
      catalogIsPersisted={databaseCatalog.length > 0}
      clerkConfigured={clerkConfigured}
      persistenceEnabled={persistenceEnabled}
      catalog={selectPublicCatalog(databaseCatalog, fallbackCatalog)}
    />
  );
}
