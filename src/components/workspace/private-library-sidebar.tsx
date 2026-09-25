"use client";

import {
  MyLibrarySongs,
  type LoadedSong,
} from "@/components/workspace/song-persistence";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";

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
      className="min-w-0 border-r border-(--line) px-3.75 py-6.25 max-[720px]:hidden"
      aria-label="My Library"
    >
      <div className="grid gap-1 px-2">
        <span className="text-[13px] font-[680] text-foreground">My Library</span>
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
    <section className="mt-6" aria-labelledby="recent-set-lists-heading">
      <h2 className="px-2 text-[10px] font-[680] uppercase tracking-[0.08em] text-[var(--muted-soft)]" id="recent-set-lists-heading">
        Recent set lists
      </h2>
      {isLoading || (isAuthenticated && setLists === undefined) ? (
        <p className="px-2 py-3.5 text-[10px] leading-[1.5] text-[var(--muted-soft)]" role="status">
          Loading your set lists…
        </p>
      ) : !isAuthenticated ? (
        <p className="px-2 py-3.5 text-[10px] leading-[1.5] text-[var(--muted-soft)]">
          <Link className="font-[650] text-[var(--accent-deep)] no-underline hover:underline" href="/sign-in">
            Sign in
          </Link>{" "}
          to sync your set lists.
        </p>
      ) : setLists?.length ? (
        <div className="mt-2 grid gap-[3px]" aria-label="Recent set lists">
          {setLists.slice(0, 5).map((setList) => (
            <Link
              className="block min-w-0 rounded-[8px] p-2 no-underline transition-[background-color] duration-[160ms] ease-in-out hover:bg-[var(--paper-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              href={`/setlists/${encodeURIComponent(setList._id)}`}
              key={setList._id}
            >
              <span className="block truncate text-[11px] font-[620] text-[var(--ink)]">{setList.name}</span>
              <span className="mt-0.5 block text-[10px] text-[var(--muted-soft)]">
                {setList.itemCount} song{setList.itemCount === 1 ? "" : "s"} · Updated {new Date(setList.updatedAt).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="px-2 py-3.5 text-[10px] leading-[1.5] text-[var(--muted-soft)]">
          Your set lists will appear here.
        </p>
      )}
      {isAuthenticated && (
        <Link
          className="mt-2 block rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-center text-[10px] font-[650] text-[var(--accent-deep)] no-underline transition-[border-color,background-color] hover:border-[var(--line-strong)] hover:bg-[var(--paper-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          href="/setlists"
        >
          All set lists
        </Link>
      )}
    </section>
  );
}
