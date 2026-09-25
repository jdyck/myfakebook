"use client";

import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";

import { api } from "../../../convex/_generated/api";
import { PublicLibraryBackedWorkspace } from "@/components/workspace/public-library-backed-workspace";

export function PrivateSongBackedWorkspace({ id }: { id: string }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const songs = useQuery(api.songs.listMySongs, isAuthenticated ? {} : "skip");

  if (isLoading || (isAuthenticated && songs === undefined)) {
    return <main className="grid min-h-screen place-items-center" role="status">Loading song…</main>;
  }

  const song = songs?.find((candidate) => candidate._id === id || candidate.legacyPrivateId === id);
  if (!song) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Song not found</h1>
          <Link className="mt-3 inline-block text-(--accent-deep) underline" href="/mylibrary">Back to My Library</Link>
        </div>
      </main>
    );
  }

  return (
    <PublicLibraryBackedWorkspace
      clerkConfigured
      persistenceEnabled
      initialPrivateSong={{ id: song._id, title: song.title, abc: song.abc, publicationState: song.publicationState }}
    />
  );
}
