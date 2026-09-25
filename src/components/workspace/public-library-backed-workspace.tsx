"use client";

import { useQuery } from "convex/react";
import Link from "next/link";

import { api } from "../../../convex/_generated/api";
import { MyFakebookWorkspace } from "@/components/workspace/my-fakebook-workspace";
import type { LoadedSong } from "@/components/workspace/song-persistence";

type PublicLibraryBackedWorkspaceProps = {
  clerkConfigured: boolean;
  persistenceEnabled: boolean;
  initialPublicSongId?: string;
  initialPrivateSong?: LoadedSong;
};

export function PublicLibraryBackedWorkspace({
  clerkConfigured,
  persistenceEnabled,
  initialPublicSongId,
  initialPrivateSong,
}: PublicLibraryBackedWorkspaceProps) {
  const publishedSongs = useQuery(api.songs.listPublicSongs);

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
    legacyId: song.legacyId,
    isLegacy: song.isLegacy,
    title: song.title,
    writers: song.writers,
    rhythm: song.rhythm,
    abc: song.abc,
  }));
  const initialSong = publicSongs.find((song) => song.id === initialPublicSongId || song.legacyId === initialPublicSongId);

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
      key={initialPrivateSong?.id ?? initialSong?.id ?? "default"}
      publicLibraryIsPersisted={publicSongs.length > 0}
      clerkConfigured={clerkConfigured}
      persistenceEnabled={persistenceEnabled}
      publicSongs={publicSongs}
      initialPublicSongId={initialSong?.id}
      initialPrivateSong={initialPrivateSong}
    />
  );
}
