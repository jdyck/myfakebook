"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";

import { Header } from "@/components/app-shell/header/header";
import { publicationLabel } from "@/lib/songs/types";
import type { PublicSong } from "@/lib/songs/public-library";
import { usePublicSongs } from "./use-public-songs";
import componentStyles from "./public-songs-list.module.css";

type PublicSongsListProps = {
  clerkConfigured: boolean;
  songs: readonly PublicSong[] | undefined;
  isAdmin?: boolean;
};

export function PublicSongsListBacked({ clerkConfigured }: {
  clerkConfigured: boolean;
}) {
  return clerkConfigured
    ? <AdminAwarePublicSongsList clerkConfigured={clerkConfigured} />
    : <ConnectedPublicSongsList clerkConfigured={clerkConfigured} isAdmin={false} />;
}

function AdminAwarePublicSongsList({ clerkConfigured }: { clerkConfigured: boolean }) {
  const { user } = useUser();
  return <ConnectedPublicSongsList clerkConfigured={clerkConfigured} isAdmin={user?.publicMetadata?.role === "admin"} />;
}

function ConnectedPublicSongsList({ clerkConfigured, isAdmin }: { clerkConfigured: boolean; isAdmin: boolean }) {
  const { songs, loading } = usePublicSongs({ isAdmin });
  return <PublicSongsList clerkConfigured={clerkConfigured} isAdmin={isAdmin} songs={loading ? undefined : songs} />;
}

export function PublicSongsList({ clerkConfigured, songs, isAdmin = false }: PublicSongsListProps) {

  return (
    <div className={componentStyles.pageShell}>
      <Header clerkConfigured={clerkConfigured} />
      <main className={componentStyles.pageContent}>
        <div className={componentStyles.pageHeadingRow}>
          <div>
            <h1 id="songs-heading" className={componentStyles.pageTitle}>Songs</h1>
            <p className={componentStyles.pageDescription}>
              {isAdmin ? "Published songs in all territories." : "Songs available in your region."}
            </p>
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
                    {isAdmin && (
                      <span className={componentStyles.territoryLabel}>
                        {publicationLabel(song.publicationTerritory ?? "worldwide")}
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
