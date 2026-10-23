"use client";

import type { SongContent } from "@/lib/song-content";
import type { ChangeEventHandler } from "react";
import { RecentMyLibrarySongs } from "@/components/library/my-library/recent-songs";
import type { LoadedSong } from "@/components/songs/types";
import { SidebarAction } from "@/components/library/my-library/sidebar-action";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import componentStyles from "./my-library-sidebar.module.css";

type MyLibrarySidebarProps = {
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
        <span className={componentStyles.libraryTitle}>My Library</span>
      </div>
      <RecentMyLibrarySongs
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
      <RecentSetLists />
    </aside>
  );
}

function RecentSetLists() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const setLists = useQuery(api.binders.listMine, isAuthenticated ? {} : "skip");

  return (
    <section className={componentStyles.recentSetListsSection} aria-labelledby="recent-set-lists-heading">
      <h2 className={componentStyles.sectionHeading} id="recent-set-lists-heading">
        Recent binders
      </h2>
      {isLoading || (isAuthenticated && setLists === undefined) ? (
        <p className={componentStyles.setListsMessage} role="status">
          Loading your binders…
        </p>
      ) : !isAuthenticated ? (
        <p className={componentStyles.setListsMessage}>
          <Link className={componentStyles.signInLink} href="/sign-in">
            Sign in
          </Link>{" "}
          to sync your binders.
        </p>
      ) : setLists?.length ? (
        <div className={componentStyles.recentSetListList} aria-label="Recent binders">
          {setLists.slice(0, 5).map((setList) => (
            <Link
              className={componentStyles.recentSetListLink}
              href={`/setlists/${encodeURIComponent(setList._id)}`}
              key={setList._id}
            >
              <span className={componentStyles.setListName}>{setList.name}</span>
              <span className={componentStyles.setListMetadata}>
                {setList.itemCount} song{setList.itemCount === 1 ? "" : "s"} · Updated {new Date(setList.updatedAt).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className={componentStyles.setListsMessage}>
          Your binders will appear here.
        </p>
      )}
      {isAuthenticated && (
        <>
          <SidebarAction href="/setlists" label="All binders" />
          <SidebarAction href="/setlists" label="New binder" icon="plus" />
        </>
      )}
    </section>
  );
}
