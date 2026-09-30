"use client";

import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { publicationStatusForSong } from "@/components/songs/types";
import { Header } from "@/components/app-shell/header/header";
import componentStyles from "./my-library-list.module.css";

type LibrarySong = {
  id: Id<"songs">;
  title: string;
  updatedAt: number;
  publicationState: "private" | "published";
  publicationTerritory?: "US" | "worldwide";
};

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
  return (
    <div className={componentStyles.pageShell}>
      <Header clerkConfigured />
      <main className={componentStyles.pageContent}>
        <div className={componentStyles.pageHeadingRow}>
          <div>
            <h1 className={componentStyles.pageTitle}>My Library</h1>
            <p className={componentStyles.pageDescription}>Your saved songs.</p>
          </div>
          <div className={componentStyles.headingActions}>
            {!loading && songs && <span className={componentStyles.songCount}>{songs.length} song{songs.length === 1 ? "" : "s"}</span>}
            <Link className={componentStyles.newSongLink} href="/new">New song</Link>
          </div>
        </div>
        {loading ? (
          <p role="status">Loading your songs…</p>
        ) : songs?.length ? (
          <ul className={componentStyles.songList}>
            {songs.map((song) => (
              <li key={song.id}>
                <Link
                  className={componentStyles.songLink}
                  href={`/mylibrary/${encodeURIComponent(song.id)}`}
                >
                  <span className={componentStyles.songDetails}>
                    <span className={componentStyles.songTitle}>{song.title}</span>
                    <span className={componentStyles.songMetadata}>
                      {publicationStatusForSong(song)} · Updated {new Date(song.updatedAt).toLocaleDateString()}
                    </span>
                  </span>
                  <span className={componentStyles.openSongLabel}>Open</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={componentStyles.emptyLibraryMessage}>No songs in your library yet. <Link className={componentStyles.createSongLink} href="/new">Create a song</Link> to get started.</p>
        )}
      </main>
    </div>
  );
}
