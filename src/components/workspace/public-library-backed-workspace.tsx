"use client";

import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { MyFakebookWorkspace } from "@/components/workspace/my-fakebook-workspace";
import type { LoadedSong } from "@/components/workspace/song-persistence";
import type { SongDisplaySettings } from "@/lib/abc-display";

type PublicLibraryBackedWorkspaceProps = {
  clerkConfigured: boolean;
  persistenceEnabled: boolean;
  initialPublicSongId?: string;
  initialPrivateSong?: LoadedSong;
  initialDisplaySettings?: SongDisplaySettings;
  setListId?: string;
  setListItemId?: string;
  setListReturn?: {
    href: string;
    name: string;
    setListId: Id<"setLists">;
    itemId: Id<"setListItems">;
    songId: Id<"songs">;
  };
};

export function PublicLibraryBackedWorkspace({
  clerkConfigured,
  persistenceEnabled,
  initialPublicSongId,
  initialPrivateSong,
  initialDisplaySettings,
  setListId,
  setListItemId,
  setListReturn,
}: PublicLibraryBackedWorkspaceProps) {
  const { isAuthenticated } = useConvexAuth();
  const publishedSongs = useQuery(api.songs.listPublicSongs);
  const validSetListId = setListId && /^[a-zA-Z0-9_-]+$/.test(setListId) ? setListId as Id<"setLists"> : null;
  const setList = useQuery(api.setLists.get, isAuthenticated && validSetListId ? { id: validSetListId } : "skip");

  if (publishedSongs === undefined) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--canvas)] px-6">
        <p className="text-[11px] text-[var(--muted)]" role="status">
          Loading Public Library…
        </p>
      </main>
    );
  }

  const publicSongs = publishedSongs.map((song) => ({
    id: song.id,
    legacyId: "legacyId" in song ? song.legacyId : undefined,
    isLegacy: song.isLegacy,
    title: song.title,
    writers: song.writers,
    rhythm: song.rhythm,
    abc: song.abc,
  }));
  const initialSong = publicSongs.find((song) => song.id === initialPublicSongId || song.legacyId === initialPublicSongId);
  const setListItem = setList?.items.find((item) => item._id === setListItemId && item.songId === initialSong?.id);
  const resolvedSetListReturn = setListReturn ?? (setList && setListItem && validSetListId ? {
    href: `/setlists/${encodeURIComponent(setList._id)}`,
    name: setList.name,
    setListId: validSetListId,
    itemId: setListItem._id,
    songId: setListItem.songId,
  } : undefined);
  const resolvedDisplaySettings = initialDisplaySettings ?? setListItem?.displaySettings;

  if (initialPublicSongId && !initialSong) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Song not found</h1>
          <Link className="mt-3 inline-block text-(--accent-deep) underline" href="/songs">Browse songs</Link>
        </div>
      </main>
    );
  }

  return (
    <MyFakebookWorkspace
      key={`${initialPrivateSong?.id ?? initialSong?.id ?? "default"}:${JSON.stringify(resolvedDisplaySettings ?? null)}:${resolvedSetListReturn?.href ?? ""}`}
      publicLibraryIsPersisted={publicSongs.length > 0}
      clerkConfigured={clerkConfigured}
      persistenceEnabled={persistenceEnabled}
      publicSongs={publicSongs}
      initialPublicSongId={initialSong?.id}
      initialPrivateSong={initialPrivateSong}
      initialDisplaySettings={resolvedDisplaySettings}
      setListReturn={resolvedSetListReturn}
    />
  );
}
