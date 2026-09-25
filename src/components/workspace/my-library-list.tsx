"use client";

import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Header } from "@/components/layout/header";

type LibrarySong = {
  id: Id<"songs">;
  title: string;
  updatedAt: number;
  publicationState: "private" | "published";
};

export function MyLibraryListBacked() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const savedSongs = useQuery(api.songs.listMySongs, isAuthenticated ? {} : "skip");
  const songs = savedSongs?.map((song) => ({ id: song._id, title: song.title, updatedAt: song.updatedAt, publicationState: song.publicationState }));
  return <MyLibraryList songs={songs} loading={isLoading || (isAuthenticated && !savedSongs)} />;
}

export function MyLibraryList({ songs, loading = false }: { songs: readonly LibrarySong[] | undefined; loading?: boolean }) {
  return (
    <div className="min-h-screen">
      <Header clerkConfigured />
      <main className="mx-auto max-w-3xl px-4 py-8 max-[720px]:py-5">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">My Library</h1>
            <p className="mt-1 text-sm text-(--muted-soft)">Your saved songs.</p>
          </div>
          <div className="flex items-center gap-3">
            {!loading && songs && <span className="shrink-0 text-xs text-(--muted-soft)">{songs.length} song{songs.length === 1 ? "" : "s"}</span>}
            <Link className="rounded-lg bg-(--accent) px-3 py-2 text-xs font-semibold text-white" href="/new">New song</Link>
          </div>
        </div>
        {loading ? (
          <p role="status">Loading your songs…</p>
        ) : songs?.length ? (
          <ul className="grid gap-2">
            {songs.map((song) => (
              <li key={song.id}>
                <Link
                  className="flex items-center justify-between gap-4 rounded-lg border border-(--line) bg-(--paper) px-4 py-3 hover:border-(--line-strong) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)"
                  href={`/mylibrary/${encodeURIComponent(song.id)}`}
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-foreground">{song.title}</span>
                    <span className="mt-0.5 block text-xs text-(--muted-soft)">{song.publicationState === "published" ? "Published" : "Private"} · Updated {new Date(song.updatedAt).toLocaleDateString()}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-(--accent-deep)">Open</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-(--muted)">No songs in your library yet. <Link className="text-(--accent-deep) underline" href="/new">Create a song</Link> to get started.</p>
        )}
      </main>
    </div>
  );
}
