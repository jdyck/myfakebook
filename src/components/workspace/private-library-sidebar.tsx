"use client";

import {
  MyLibrarySongs,
  type LoadedSong,
} from "@/components/workspace/song-persistence";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import componentStyles from "./private-library-sidebar.module.css";

type PrivateLibrarySidebarProps = {
  enabled: boolean;
  abc: string;
  title: string;
  isPublicSong: boolean;
  currentSong: LoadedSong | null;
  recentSongIds: readonly string[];
  onCurrentSongChange: (song: LoadedSong | null) => void;
  onMySongsChange: (songs: LoadedSong[]) => void;
  onLoad: (song: LoadedSong) => void;
  onStatus: (status: string) => void;
};

export function PrivateLibrarySidebar({
  enabled,
  abc,
  title,
  isPublicSong,
  currentSong,
  recentSongIds,
  onCurrentSongChange,
  onMySongsChange,
  onLoad,
  onStatus,
}: PrivateLibrarySidebarProps) {
  if (!enabled) return null;

  return (
    <aside
      className={componentStyles.style0}
      aria-label="My Library"
    >
      <div className={componentStyles.style1}>
        <span className={componentStyles.style2}>My Library</span>
      </div>
      <MyLibrarySongs
        abc={abc}
        enabled={enabled}
        isPublicSong={isPublicSong}
        currentSong={currentSong}
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
  const setLists = useQuery(api.setLists.listMine, isAuthenticated ? {} : "skip");

  return (
    <section className={componentStyles.style3} aria-labelledby="recent-set-lists-heading">
      <h2 className={componentStyles.style4} id="recent-set-lists-heading">
        Recent set lists
      </h2>
      {isLoading || (isAuthenticated && setLists === undefined) ? (
        <p className={componentStyles.style5} role="status">
          Loading your set lists…
        </p>
      ) : !isAuthenticated ? (
        <p className={componentStyles.style5}>
          <Link className={componentStyles.style6} href="/sign-in">
            Sign in
          </Link>{" "}
          to sync your set lists.
        </p>
      ) : setLists?.length ? (
        <div className={componentStyles.style7} aria-label="Recent set lists">
          {setLists.slice(0, 5).map((setList) => (
            <Link
              className={componentStyles.style8}
              href={`/setlists/${encodeURIComponent(setList._id)}`}
              key={setList._id}
            >
              <span className={componentStyles.style9}>{setList.name}</span>
              <span className={componentStyles.style10}>
                {setList.itemCount} song{setList.itemCount === 1 ? "" : "s"} · Updated {new Date(setList.updatedAt).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className={componentStyles.style5}>
          Your set lists will appear here.
        </p>
      )}
      {isAuthenticated && (
        <Link
          className={componentStyles.style11}
          href="/setlists"
        >
          All set lists
        </Link>
      )}
    </section>
  );
}
