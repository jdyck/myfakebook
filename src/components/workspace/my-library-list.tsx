"use client";

import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Header } from "@/components/layout/header";
import componentStyles from "./my-library-list.module.css";

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
    <div className={componentStyles.style0}>
      <Header clerkConfigured />
      <main className={componentStyles.style1}>
        <div className={componentStyles.style2}>
          <div>
            <h1 className={componentStyles.style3}>My Library</h1>
            <p className={componentStyles.style4}>Your saved songs.</p>
          </div>
          <div className={componentStyles.style5}>
            {!loading && songs && <span className={componentStyles.style6}>{songs.length} song{songs.length === 1 ? "" : "s"}</span>}
            <Link className={componentStyles.style7} href="/new">New song</Link>
          </div>
        </div>
        {loading ? (
          <p role="status">Loading your songs…</p>
        ) : songs?.length ? (
          <ul className={componentStyles.style8}>
            {songs.map((song) => (
              <li key={song.id}>
                <Link
                  className={componentStyles.style9}
                  href={`/mylibrary/${encodeURIComponent(song.id)}`}
                >
                  <span className={componentStyles.style10}>
                    <span className={componentStyles.style11}>{song.title}</span>
                    <span className={componentStyles.style12}>{song.publicationState === "published" ? "Published" : "Private"} · Updated {new Date(song.updatedAt).toLocaleDateString()}</span>
                  </span>
                  <span className={componentStyles.style13}>Open</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={componentStyles.style14}>No songs in your library yet. <Link className={componentStyles.style15} href="/new">Create a song</Link> to get started.</p>
        )}
      </main>
    </div>
  );
}
