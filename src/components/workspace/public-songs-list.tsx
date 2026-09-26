"use client";

import { useQuery } from "convex/react";
import Link from "next/link";

import { api } from "../../../convex/_generated/api";
import { Header } from "@/components/layout/header";
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
    <div className={componentStyles.style0}>
      <Header clerkConfigured={clerkConfigured} />
      <main className={componentStyles.style1}>
        <div className={componentStyles.style2}>
          <div>
            <h1 id="songs-heading" className={componentStyles.style3}>Songs</h1>
            <p className={componentStyles.style4}>Songs available to everyone.</p>
          </div>
          {songs && <span className={componentStyles.style5}>{songs.length} song{songs.length === 1 ? "" : "s"}</span>}
        </div>
        {!songs ? (
          <p role="status">Loading songs…</p>
        ) : songs.length === 0 ? (
          <p>No published songs yet.</p>
        ) : (
          <ul className={componentStyles.style6}>
            {songs.map((song) => (
              <li key={song.id}>
                <Link
                  className={componentStyles.style7}
                  href={`/songs/${encodeURIComponent(song.id)}`}
                >
                  <span className={componentStyles.style8}>
                    <span className={componentStyles.style9}>{song.title}</span>
                    {(song.writers || song.rhythm) && (
                      <span className={componentStyles.style10}>
                        {[song.writers, song.rhythm].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </span>
                  <span className={componentStyles.style11}>View</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
