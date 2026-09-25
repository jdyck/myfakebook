"use client";

import { useQuery } from "convex/react";
import Link from "next/link";

import { api } from "../../../convex/_generated/api";
import { Header } from "@/components/layout/header";
import type { PublicSong } from "@/lib/public-library";

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
    legacyId: song.legacyId,
    isLegacy: song.isLegacy,
    title: song.title,
    writers: song.writers,
    rhythm: song.rhythm,
    abc: song.abc,
  }));
  return <PublicSongsList clerkConfigured={clerkConfigured} songs={songs} />;
}

export function PublicSongsList({ clerkConfigured, songs }: PublicSongsListProps) {

  return (
    <div className="min-h-screen">
      <Header clerkConfigured={clerkConfigured} />
      <main className="mx-auto max-w-3xl px-4 py-8 max-[720px]:py-5">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <div>
            <h1 id="songs-heading" className="text-2xl font-bold">Songs</h1>
            <p className="mt-1 text-sm text-(--muted-soft)">Songs available to everyone.</p>
          </div>
          {songs && <span className="shrink-0 text-xs text-(--muted-soft)">{songs.length} song{songs.length === 1 ? "" : "s"}</span>}
        </div>
        {!songs ? (
          <p role="status">Loading songs…</p>
        ) : songs.length === 0 ? (
          <p>No published songs yet.</p>
        ) : (
          <ul className="grid gap-2">
            {songs.map((song) => (
              <li key={song.id}>
                <Link
                  className="flex items-center justify-between gap-4 rounded-lg border border-(--line) bg-(--paper) px-4 py-3 hover:border-(--line-strong) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)"
                  href={`/songs/${encodeURIComponent(song.id)}`}
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-foreground">{song.title}</span>
                    {(song.writers || song.rhythm) && (
                      <span className="mt-0.5 block text-xs text-(--muted-soft)">
                        {[song.writers, song.rhythm].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-(--accent-deep)">View</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
