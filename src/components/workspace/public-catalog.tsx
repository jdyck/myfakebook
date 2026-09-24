"use client";

import type { PublicCatalogChart } from "@/lib/public-catalog";

type PublicCatalogProps = {
  catalog: readonly PublicCatalogChart[];
  selectedCatalogId: string | null;
  onOpenChart: (chart: PublicCatalogChart) => void;
};

export function PublicCatalog({ catalog, selectedCatalogId, onOpenChart }: PublicCatalogProps) {
  return (
    <section
      aria-labelledby="public-catalog-heading"
      className="mb-5 rounded-[11px] border border-(--line) bg-(--paper) px-4 py-3.5"
    >
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <div>
          <h2 id="public-catalog-heading" className="m-0 text-[12px] font-[720] text-foreground">
            Public catalog
          </h2>
          <p className="m-0 mt-1 text-[10px] text-(--muted-soft)">
            Published charts available to every guest.
          </p>
        </div>
        <span className="font-mono text-[9px] text-(--muted-soft)">
          {catalog.length} chart{catalog.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="grid gap-1.5">
        {catalog.map((chart) => {
          const isSelected = selectedCatalogId === chart.id;
          return (
            <button
              aria-pressed={isSelected}
              className={`flex w-full items-center justify-between gap-3 rounded-[8px] border px-3 py-2 text-left transition-[border-color,background-color] duration-160 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent) ${
                isSelected
                  ? "border-(--accent) bg-(--accent-soft)"
                  : "border-(--line) bg-(--paper-soft) hover:border-(--line-strong)"
              }`}
              key={chart.id}
              type="button"
              onClick={() => onOpenChart(chart)}
            >
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-[680] text-foreground">{chart.title}</span>
                <span className="mt-0.5 block truncate text-[10px] text-(--muted-soft)">
                  {chart.writers} · {chart.rhythm}
                </span>
              </span>
              <span className="shrink-0 text-[10px] font-[650] text-(--accent-deep)">
                {isSelected ? "Open" : "View"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
