"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useState, type ReactNode } from "react";
import { EditorialLibraryView } from "../editorial-library-view";
import { publicationLabel } from "@/lib/songs/types";
import type { PublicSong } from "@/lib/songs/public-library";
import { compareSongTitles } from "@/lib/songs/title-sort";
import styles from "../editorial-library.module.css";

type SortField = "title" | "writers" | "rhythm";
const countLabel = (count: number) => String(count).padStart(2, "0");

export function PublicSongsListView({ songs, isAdmin = false, header, captionClassName }: { songs: readonly PublicSong[] | undefined; isAdmin?: boolean; header?: ReactNode; captionClassName?: string }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ field: SortField; ascending: boolean }>({ field: "title", ascending: true });
  const loading = songs === undefined;
  const allSongs = songs ?? [];
  const searchQuery = query.trim().toLocaleLowerCase();
  const visibleSongs = allSongs.filter((song) =>
    [song.title, song.writers, song.rhythm].some((value) => value.toLocaleLowerCase().includes(searchQuery)),
  ).sort((a, b) => {
    const comparison = sort.field === "title"
      ? compareSongTitles(a.title, b.title)
      : a[sort.field].localeCompare(b[sort.field]) || compareSongTitles(a.title, b.title);
    return sort.ascending ? comparison : -comparison;
  });

  function toggleSort(field: SortField) {
    setSort({ field, ascending: sort.field === field ? !sort.ascending : true });
  }

  return (
    <EditorialLibraryView
      header={header}
      captionClassName={captionClassName}
      section="songs"
      title="Songs"
      titleId="songs-heading"
      eyebrow="THE SONG COLLECTION"
      description={<>{isAdmin ? "Published songs in all territories." : "Songs available in your region."}<br /><span>A repertoire to explore.</span></>}
      noteTitle="THE SONGS WE SHARE."
      note={<>Discover them.<br />Make them yours.<br />Take them further.</>}
      stats={[
        ["IN THE CATALOG", allSongs.length],
        ["COMPOSERS / WRITERS", new Set(allSongs.map((song) => song.writers.trim()).filter(Boolean)).size],
        ["STYLES", new Set(allSongs.map((song) => song.rhythm.trim()).filter(Boolean)).size],
      ]}
      loading={loading}
    >
      <section className={styles.songLibrary} aria-label="Published songs" aria-busy={loading}>
        <div className={styles.libraryToolbar}>
          <div className={styles.filters} role="group" aria-label="Song catalog">
            <button type="button" className={styles.filter} aria-pressed={!searchQuery} onClick={() => setQuery("")}>
              All songs <span>{loading ? "—" : countLabel(allSongs.length)}</span>
            </button>
          </div>
          <label className={styles.search}>
            <Search size={16} strokeWidth={1.5} aria-hidden="true" />
            <input type="search" placeholder="Find a song" aria-label="Find a song" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
        </div>
        <table className={styles.songTable}>
          <caption className="sr-only">Published songs, composers, and styles{isAdmin ? ", with publication territories" : ""}</caption>
          <colgroup><col className={styles.numberCol} /><col /><col className={styles.visibilityCol} /><col className={styles.dateCol} /><col className={styles.actionCol} /></colgroup>
          <thead><tr>
            <th scope="col" className={styles.rowNumber}>NO.</th>
            {([["title", "SONG TITLE"], ["writers", "COMPOSER / WRITERS"], ["rhythm", "STYLE"]] as const).map(([field, label]) => (
              <th key={field} scope="col" aria-sort={sort.field === field ? (sort.ascending ? "ascending" : "descending") : undefined}>
                <button type="button" onClick={() => toggleSort(field)}>{label}{sort.field === field && ` / ${sort.ascending ? "A–Z" : "Z–A"}`}</button>
              </th>
            ))}
            <th scope="col"><span className="sr-only">Open song</span></th>
          </tr></thead>
          <tbody>
            {!loading && visibleSongs.map((song, index) => {
              const href = `/songs/${encodeURIComponent(song.id)}`;
              return (
                <tr key={song.id}>
                  <td className={styles.rowNumber}>{countLabel(index + 1)}</td>
                  <td>
                    <Link className={styles.songName} href={href}>{song.title}</Link>
                    {isAdmin && <span className={styles.territory}>{publicationLabel(song.publicationTerritory ?? "worldwide")}</span>}
                    <span className={styles.mobileMeta}>{[song.writers, song.rhythm].filter(Boolean).join(" · ")}</span>
                  </td>
                  <td><span className={`${styles.visibility} break-words`}>{song.writers || "—"}</span></td>
                  <td><span className={`${styles.visibility} break-words`}>{song.rhythm || "—"}</span></td>
                  <td><Link className={styles.openSong} href={href} aria-label={`Open ${song.title}`}>Open</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loading ? <p className={styles.emptyState} role="status">Loading songs…</p> : !allSongs.length ? (
          <div className={styles.emptyState}><h2>No published songs yet.</h2><p>Published songs will appear here when they’re available.</p></div>
        ) : !visibleSongs.length ? (
          <div className={styles.emptyState}><h2>No songs found.</h2><p>Try another title, composer, or style.</p><button type="button" onClick={() => setQuery("")}>Clear search</button></div>
        ) : null}
        <div className={styles.tableFooter}>
          <p role="status">{loading ? "LOADING THE COLLECTION" : searchQuery ? `${countLabel(visibleSongs.length)} OF ${countLabel(allSongs.length)} SONGS` : `${countLabel(allSongs.length)} SONG${allSongs.length === 1 ? "" : "S"} IN THE CATALOG`}</p>
          <p>DISCOVER / PLAY / MAKE IT YOURS</p>
        </div>
      </section>
    </EditorialLibraryView>
  );
}
