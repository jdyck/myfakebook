"use client";

import { useRef, useState, type ReactNode } from "react";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { EditorialLibraryView } from "@/components/library/editorial-library-view";
import styles from "@/components/library/editorial-library.module.css";
import componentStyles from "./binders-index.module.css";

type BinderSummary = {
  _id: string;
  name: string;
  published?: boolean;
  itemCount: number;
  updatedAt: number;
};
type SortField = "name" | "itemCount" | "updatedAt";
const countLabel = (count: number) => String(count).padStart(2, "0");
const dateLabel = (timestamp: number) => new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function BindersListView({ binders, loading = false, onCreate, header }: {
  header?: ReactNode;
  binders: readonly BinderSummary[] | undefined;
  loading?: boolean;
  onCreate?: (name: string) => Promise<void>;
}) {
  const nameInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ field: SortField; ascending: boolean }>({ field: "updatedAt", ascending: false });
  const allBinders = binders ?? [];
  const searchQuery = query.trim().toLocaleLowerCase();
  const visibleBinders = allBinders.filter((binder) => binder.name.toLocaleLowerCase().includes(searchQuery)).sort((a, b) => {
    const comparison = sort.field === "name" ? a.name.localeCompare(b.name) : a[sort.field] - b[sort.field];
    return sort.ascending ? comparison : -comparison;
  });

  function toggleSort(field: SortField) {
    setSort({ field, ascending: sort.field === field ? !sort.ascending : field === "name" });
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onCreate || saving) return;
    setSaving(true);
    setStatus(null);
    try {
      await onCreate(name);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Couldn’t create binder");
    } finally {
      setSaving(false);
    }
  }

  return (
    <EditorialLibraryView
      header={header}
      section="binders"
      title="Binders"
      titleId="binders-heading"
      stats={[
        ["BINDERS", allBinders.length],
        ["AVAILABLE SONGS", allBinders.reduce((count, binder) => count + binder.itemCount, 0)],
        ["READY TO PLAY", allBinders.filter((binder) => binder.itemCount > 0).length],
      ]}
      loading={loading}
      primaryAction={onCreate ? <button className={styles.primary} type="button" onClick={() => nameInput.current?.focus()}><Plus size={16} strokeWidth={1.5} aria-hidden="true" />New binder</button> : null}
    >
      <section className={styles.songLibrary} aria-label="Available binders" aria-busy={loading}>
        {onCreate ? <>
          <form className={componentStyles.createBinderForm} onSubmit={(event) => void handleCreate(event)}>
            <div className={componentStyles.formField}>
              <label className={styles.eyebrow} htmlFor="new-binder-name">CREATE A BINDER</label>
              <input ref={nameInput} className={componentStyles.binderNameInput} id="new-binder-name" maxLength={80} placeholder="For example, Friday at the Blue Note" required value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <button className={styles.primary} disabled={saving} type="submit">{saving ? "Creating…" : "Create binder"}</button>
          </form>
          {status && <p className={componentStyles.formErrorMessage} role="alert">{status}</p>}
        </> : <p className={componentStyles.setupMessage}>Sign in to create your own private binders.</p>}
        <div className={styles.libraryToolbar}>
          <div className={styles.filters} role="group" aria-label="Binder collection">
            <button type="button" className={styles.filter} aria-pressed={!searchQuery} onClick={() => setQuery("")}>All binders <span>{loading ? "—" : countLabel(allBinders.length)}</span></button>
          </div>
          <label className={styles.search}>
            <Search size={16} strokeWidth={1.5} aria-hidden="true" />
            <input type="search" placeholder="Find a binder" aria-label="Find a binder" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
        </div>
        <table className={styles.songTable}>
          <caption className="sr-only">Available binders, song counts, and updated dates</caption>
          <colgroup><col className={styles.numberCol} /><col /><col className={styles.visibilityCol} /><col className={styles.dateCol} /><col className={styles.actionCol} /></colgroup>
          <thead><tr>
            <th scope="col" className={styles.rowNumber}>NO.</th>
            {([["name", "BINDER NAME"], ["itemCount", "SONGS"], ["updatedAt", "UPDATED"]] as const).map(([field, label]) => (
              <th key={field} scope="col" aria-sort={sort.field === field ? (sort.ascending ? "ascending" : "descending") : undefined}>
                <button type="button" onClick={() => toggleSort(field)}>{label}{sort.field === field && <span className={styles.sortDirection}>{field === "name" ? (sort.ascending ? "A–Z" : "Z–A") : field === "updatedAt" ? (sort.ascending ? "OLDEST FIRST" : "NEWEST FIRST") : (sort.ascending ? "FEWEST FIRST" : "MOST FIRST")}</span>}</button>
              </th>
            ))}
            <th scope="col"><span className="sr-only">Open binder</span></th>
          </tr></thead>
          <tbody>
            {!loading && visibleBinders.map((binder, index) => {
              const href = `/binders/${encodeURIComponent(binder._id)}`;
              const songCount = `${binder.itemCount} song${binder.itemCount === 1 ? "" : "s"}`;
              return <tr key={binder._id}>
                <td className={styles.rowNumber}>{countLabel(index + 1)}</td>
                <td><Link className={styles.songName} href={href}>{binder.name}</Link><span className={styles.territory}>{binder.published ? "Published" : "Private"}</span><span className={styles.mobileMeta}>{songCount}<br />{dateLabel(binder.updatedAt)}</span></td>
                <td><span className={styles.visibility}>{songCount}</span></td>
                <td className={styles.updated}><time dateTime={new Date(binder.updatedAt).toISOString()}>{dateLabel(binder.updatedAt)}</time></td>
                <td><Link className={styles.openSong} href={href} aria-label={`Open ${binder.name}`}>Open</Link></td>
              </tr>;
            })}
          </tbody>
        </table>
        {loading ? <p className={styles.emptyState} role="status">Loading binders…</p> : !allBinders.length ? (
          <div className={styles.emptyState}><h2>No binders yet</h2><p>Create a binder, then add your songs or songs from the public library.</p></div>
        ) : !visibleBinders.length ? (
          <div className={styles.emptyState}><h2>No binders found.</h2><p>Try another name.</p><button type="button" onClick={() => setQuery("")}>Clear search</button></div>
        ) : null}
        <div className={styles.tableFooter}>
          <p role="status">{loading ? "LOADING BINDERS" : searchQuery ? `${countLabel(visibleBinders.length)} OF ${countLabel(allBinders.length)} BINDERS` : `${countLabel(allBinders.length)} BINDER${allBinders.length === 1 ? "" : "S"} AVAILABLE`}</p>
        </div>
      </section>
    </EditorialLibraryView>
  );
}
