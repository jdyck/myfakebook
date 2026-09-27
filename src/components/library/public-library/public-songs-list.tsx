"use client";

import { useQuery } from "convex/react";
import Link from "next/link";

import { api } from "../../../../convex/_generated/api";
import { Header } from "@/components/app-shell/header/header";
import type { PublicSong } from "@/lib/public-library";
import componentStyles from "./public-songs-list.module.css";

type PublicSongsListProps = {
  clerkConfigured: boolean;
  songs: readonly PublicSong[] | undefined;
};

export function PublicSongsListBacked({ clerkConfigured }: {
  clerkConfigured: boolean;
}) {
  const publishedSongs = useQuery(api.songs.listPublicSongs);
  const songs = publishedSongs?.map((song) => ({
    id: song.id,
    title: song.title,
    writers: song.writers,
    rhythm: song.rhythm,
    abc: song.abc,
  }));
  return <PublicSongsList clerkConfigured={clerkConfigured} songs={songs} />;
}

export function PublicSongsList({ clerkConfigured, songs }: PublicSongsListProps) {

  return (
    <div className={componentStyles.pageShell}>
      <Header clerkConfigured={clerkConfigured} />
      <main className={componentStyles.pageContent}>
        <div className={componentStyles.pageHeadingRow}>
          <div>
            <h1 id="songs-heading" className={componentStyles.pageTitle}>Songs</h1>
            <p className={componentStyles.pageDescription}>Songs available to everyone.</p>
          </div>
          {songs && <span className={componentStyles.songCount}>{songs.length} song{songs.length === 1 ? "" : "s"}</span>}
        </div>
        {!songs ? (
          <p role="status">Loading songs…</p>
        ) : songs.length === 0 ? (
          <p>No published songs yet.</p>
        ) : (
          <ul className={componentStyles.songList}>
            {songs.map((song) => (
              <li key={song.id}>
                <Link
                  className={componentStyles.songLink}
                  href={`/songs/${encodeURIComponent(song.id)}`}
                >
                  <span className={componentStyles.songDetails}>
                    <span className={componentStyles.songTitle}>{song.title}</span>
                    {(song.writers || song.rhythm) && (
                      <span className={componentStyles.songMetadata}>
                        {[song.writers, song.rhythm].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </span>
                  <span className={componentStyles.viewSongLabel}>View</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
