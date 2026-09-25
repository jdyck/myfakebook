"use client";

import { useQuery } from "convex/react";
import Link from "next/link";

import { api } from "../../../convex/_generated/api";
import { MyFakebookWorkspace } from "@/components/workspace/my-fakebook-workspace";
import type { LoadedSong } from "@/components/workspace/song-persistence";
import { selectPublicLibrary } from "@/lib/public-library-source";
import type { PublicSong } from "@/lib/public-library";

type PublicLibraryBackedWorkspaceProps = {
  clerkConfigured: boolean;
  persistenceEnabled: boolean;
  fallbackSongs: readonly PublicSong[];
  initialPublicSongId?: string;
  initialPrivateSong?: LoadedSong;
};

export function PublicLibraryBackedWorkspace({
  clerkConfigured,
  persistenceEnabled,
  fallbackSongs,
  initialPublicSongId,
  initialPrivateSong,
}: PublicLibraryBackedWorkspaceProps) {
  const publishedSongs = useQuery(api.publicSongs.listPublished);

  if (publishedSongs === undefined) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--canvas)] px-6">
        <p className="text-[11px] text-[var(--muted)]" role="status">
          Loading Public Library…
        </p>
      </main>
    );
  }

  const databaseSongs = publishedSongs.map((song) => ({
    id: song._id,
    title: song.title,
    writers: song.writers,
    rhythm: song.rhythm,
    abc: song.abc,
  }));
  const publicSongs = selectPublicLibrary(databaseSongs, fallbackSongs);

  if (initialPublicSongId && !publicSongs.some((song) => song.id === initialPublicSongId)) {
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
      key={initialPrivateSong?.id ?? initialPublicSongId ?? "default"}
      publicLibraryIsPersisted={databaseSongs.length > 0}
      clerkConfigured={clerkConfigured}
      persistenceEnabled={persistenceEnabled}
      publicSongs={publicSongs}
      initialPublicSongId={initialPublicSongId}
      initialPrivateSong={initialPrivateSong}
    />
  );
}
