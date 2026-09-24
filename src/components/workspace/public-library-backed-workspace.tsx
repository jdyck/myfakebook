"use client";

import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";
import { MyFakebookWorkspace } from "@/components/workspace/my-fakebook-workspace";
import { selectPublicLibrary } from "@/lib/public-library-source";
import type { PublicSong } from "@/lib/public-library";

type PublicLibraryBackedWorkspaceProps = {
  clerkConfigured: boolean;
  persistenceEnabled: boolean;
  fallbackSongs: readonly PublicSong[];
};

export function PublicLibraryBackedWorkspace({
  clerkConfigured,
  persistenceEnabled,
  fallbackSongs,
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

  return (
    <MyFakebookWorkspace
      publicLibraryIsPersisted={databaseSongs.length > 0}
      clerkConfigured={clerkConfigured}
      persistenceEnabled={persistenceEnabled}
      publicSongs={selectPublicLibrary(databaseSongs, fallbackSongs)}
    />
  );
}
