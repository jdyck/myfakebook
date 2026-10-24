"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { publicationLabel, publicationStatusForSong, publicationValueForSong } from "@/lib/songs/types";
import { EditorialLibrary } from "../editorial-library";
import styles from "../editorial-library.module.css";

type LibrarySong = {
  id: Id<"songs">;
  title: string;
  updatedAt: number;
  publicationState: "private" | "published";
  publicationTerritory?: "US" | "worldwide";
};

type VisibilityFilter = "all" | LibrarySong["publicationState"];
type Sort = { field: "title" | "updatedAt"; ascending: boolean };
const countLabel = (count: number) => String(count).padStart(2, "0");
const dateLabel = (timestamp: number) => new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function MyLibraryListBacked() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const savedSongs = useQuery(api.songs.listMySongs, isAuthenticated ? {} : "skip");
  const songs = savedSongs?.map((song) => ({
    id: song._id,
    title: song.title,
    updatedAt: song.updatedAt,
    publicationState: song.publicationState,
    publicationTerritory: song.publicationTerritory,
  }));
  return <MyLibraryList songs={songs} loading={isLoading || (isAuthenticated && !savedSongs)} />;
}

export function MyLibraryList({ songs, loading = false }: { songs: readonly LibrarySong[] | undefined; loading?: boolean }) {
  const [filter, setFilter] = useState<VisibilityFilter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>({ field: "updatedAt", ascending: false });
  const allSongs = songs ?? [];
  const privateCount = allSongs.filter((song) => song.publicationState === "private").length;
  const searchQuery = query.trim().toLocaleLowerCase();
  const visibleSongs = allSongs.filter((song) =>
    (filter === "all" || song.publicationState === filter) && song.title.toLocaleLowerCase().includes(searchQuery),
  ).sort((a, b) => {
    const comparison = sort.field === "title" ? a.title.localeCompare(b.title) : a.updatedAt - b.updatedAt;
    return sort.ascending ? comparison : -comparison;
  });

  function toggleSort(field: Sort["field"]) {
    setSort({ field, ascending: sort.field === field ? !sort.ascending : field === "title" });
  }

  function clearFilters() {
    setFilter("all");
    setQuery("");
  }

  return (
    <EditorialLibrary
      clerkConfigured
      section="library"
      title="My Library"
      titleId="library-title"
      eyebrow="YOUR COLLECTION"
      description={<>Your saved songs.<br /><span>A repertoire of your own.</span></>}
      noteTitle="THE SONGS YOU KEEP."
      note={<>Study them.<br />Make them yours.<br />Take them further.</>}
      stats={[["IN YOUR LIBRARY", allSongs.length], ["PRIVATE", privateCount], ["PUBLISHED", allSongs.length - privateCount]]}
      loading={loading}
    >
      <section className={styles.songLibrary} aria-label="Saved songs" aria-busy={loading}>
        <div className={styles.libraryToolbar}>
          <div className={styles.filters} role="group" aria-label="Filter by visibility">
            {([['all', 'All songs'], ['private', 'Private'], ['published', 'Published']] as const).map(([value, label]) => (
              <button type="button" className={styles.filter} aria-pressed={filter === value} onClick={() => setFilter(value)} key={value}>
                {label}{value === "all" && <> <span>{loading ? "—" : countLabel(allSongs.length)}</span></>}
              </button>
            ))}
          </div>
          <label className={styles.search}>
            <Search size={16} strokeWidth={1.5} aria-hidden="true" />
            <input type="search" placeholder="Find a song" aria-label="Find a song" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
        </div>
        <table className={styles.songTable}>
          <caption className="sr-only">Your saved songs, visibility, publication territory, and updated dates</caption>
          <colgroup><col className={styles.numberCol} /><col /><col className={styles.visibilityCol} /><col className={styles.dateCol} /><col className={styles.actionCol} /></colgroup>
          <thead><tr>
            <th scope="col" className={styles.rowNumber}>NO.</th>
            <th scope="col" aria-sort={sort.field === "title" ? (sort.ascending ? "ascending" : "descending") : undefined}>
              <button type="button" onClick={() => toggleSort("title")}>SONG TITLE{sort.field === "title" && ` / ${sort.ascending ? "A–Z" : "Z–A"}`}</button>
            </th>
            <th scope="col">VISIBILITY / TERRITORY</th>
            <th scope="col" aria-sort={sort.field === "updatedAt" ? (sort.ascending ? "ascending" : "descending") : undefined}>
              <button type="button" onClick={() => toggleSort("updatedAt")}>UPDATED{sort.field === "updatedAt" && <span className={styles.sortDirection}>{sort.ascending ? "OLDEST FIRST" : "NEWEST FIRST"}</span>}</button>
            </th>
            <th scope="col"><span className="sr-only">Open song</span></th>
          </tr></thead>
          <tbody>
            {!loading && visibleSongs.map((song, index) => {
              const href = `/mylibrary/${encodeURIComponent(song.id)}`;
              const published = song.publicationState === "published";
              return (
                <tr key={song.id}>
                  <td className={styles.rowNumber}>{countLabel(index + 1)}</td>
                  <td>
                    <Link className={styles.songName} href={href}>{song.title}</Link>
                    <span className={styles.mobileMeta}><span className={published ? styles.published : undefined}>{publicationStatusForSong(song)}</span><br />{dateLabel(song.updatedAt)}</span>
                  </td>
                  <td><span className={`${styles.visibility} ${published ? styles.published : ""}`}>{published ? "Published" : "Private"}</span>{published && <span className={styles.territory}>{publicationLabel(publicationValueForSong(song))}</span>}</td>
                  <td className={styles.updated}><time dateTime={new Date(song.updatedAt).toISOString()}>{dateLabel(song.updatedAt)}</time></td>
                  <td><Link className={styles.openSong} href={href} aria-label={`Open ${song.title}`}>Open</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loading ? <p className={styles.emptyState} role="status">Loading your songs…</p> : !allSongs.length ? (
          <div className={styles.emptyState}><h2>No songs in your library yet.</h2><p><Link href="/new">Create a song</Link> to get started.</p></div>
        ) : !visibleSongs.length ? (
          <div className={styles.emptyState}><h2>No songs found.</h2><p>Try another title or change your filter.</p><button type="button" onClick={clearFilters}>Clear filters</button></div>
        ) : null}
        <div className={styles.tableFooter}>
          <p role="status">{loading ? "LOADING YOUR COLLECTION" : filter !== "all" || searchQuery ? `${countLabel(visibleSongs.length)} OF ${countLabel(allSongs.length)} SONGS` : `${countLabel(allSongs.length)} SONG${allSongs.length === 1 ? "" : "S"} IN YOUR LIBRARY`}</p>
          <p>COLLECT / EDIT / TRANSPOSE</p>
        </div>
      </section>
    </EditorialLibrary>
  );
}
