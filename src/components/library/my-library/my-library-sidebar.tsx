"use client";

import type { SongContent } from "@/lib/songs/song-content";
import type { ChangeEventHandler } from "react";
import { RecentMyLibrarySongs } from "@/components/library/my-library/recent-songs";
import type { LoadedSong } from "@/lib/songs/types";
import { SidebarAction } from "@/components/library/my-library/sidebar-action";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import componentStyles from "./my-library-sidebar.module.css";

type MyLibrarySidebarProps = {
  hasSongEdits: boolean;
  enabled: boolean;
  abc: string;
  abcParts: string;
  content: SongContent;
  title: string;
  isPublicSong: boolean;
  currentSong: LoadedSong | null;
  onNew: () => void;
  onFileImport: ChangeEventHandler<HTMLInputElement>;
  recentSongIds: readonly string[];
  onCurrentSongChange: (song: LoadedSong | null) => void;
  onMySongsChange: (songs: LoadedSong[]) => void;
  onLoad: (song: LoadedSong) => void;
  onStatus: (status: string) => void;
};

export function MyLibrarySidebar({
  hasSongEdits,
  enabled,
  abc,
  abcParts,
  content,
  title,
  isPublicSong,
  currentSong,
  onNew,
  onFileImport,
  recentSongIds,
  onCurrentSongChange,
  onMySongsChange,
  onLoad,
  onStatus,
}: MyLibrarySidebarProps) {
  if (!enabled) return null;

  return (
    <aside
      className={componentStyles.librarySidebar}
      aria-label="My Library"
    >
      <div className={componentStyles.libraryHeadingBar}>
        <Link className={componentStyles.libraryTitle} href="/mylibrary">My Library</Link>
        <LibraryCount />
      </div>
      <RecentMyLibrarySongs
        hasSongEdits={hasSongEdits}
        abc={abc}
        abcParts={abcParts}
        content={content}
        enabled={enabled}
        isPublicSong={isPublicSong}
        currentSong={currentSong}
        onNew={onNew}
        onFileImport={onFileImport}
        recentSongIds={recentSongIds}
        onCurrentSongChange={onCurrentSongChange}
        onMySongsChange={onMySongsChange}
        onLoad={onLoad}
        onStatus={onStatus}
        title={title}
      />
      <RecentBinders />
    </aside>
  );
}

function LibraryCount() {
  const { isAuthenticated } = useConvexAuth();
  const songs = useQuery(api.songs.listMySongs, isAuthenticated ? {} : "skip");
  return <span className={componentStyles.libraryCount}>{songs ? String(songs.length).padStart(2, "0") : "—"}</span>;
}

function RecentBinders() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const binders = useQuery(api.binders.listMine, isAuthenticated ? {} : "skip");

  return (
    <section className={componentStyles.recentBindersSection} aria-labelledby="recent-binders-heading">
      <h2 className={componentStyles.sectionHeading} id="recent-binders-heading">
        Recent binders
      </h2>
      {isLoading || (isAuthenticated && binders === undefined) ? (
        <p className={componentStyles.bindersMessage} role="status">
          Loading your binders…
        </p>
      ) : !isAuthenticated ? (
        <p className={componentStyles.bindersMessage}>
          <Link className={componentStyles.signInLink} href="/sign-in">
            Sign in
          </Link>{" "}
          to sync your binders.
        </p>
      ) : binders?.length ? (
        <div className={componentStyles.recentBinderList} aria-label="Recent binders">
          {binders.slice(0, 5).map((binder) => (
            <Link
              className={componentStyles.recentBinderLink}
              href={`/binders/${encodeURIComponent(binder._id)}`}
              key={binder._id}
            >
              <span className={componentStyles.binderName}>{binder.name}</span>
              <span className={componentStyles.binderMetadata}>
                {binder.itemCount} song{binder.itemCount === 1 ? "" : "s"} · Updated {new Date(binder.updatedAt).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className={componentStyles.bindersMessage}>
          Your binders will appear here.
        </p>
      )}
      {isAuthenticated && (
        <>
          <SidebarAction href="/binders" label="All binders" />
          <SidebarAction href="/binders" label="New binder" icon="plus" />
        </>
      )}
    </section>
  );
}
