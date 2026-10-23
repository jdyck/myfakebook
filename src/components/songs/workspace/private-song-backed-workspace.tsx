"use client";

import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";

import { api } from "../../../../convex/_generated/api";
import { PublicLibraryBackedWorkspace } from "@/components/songs/workspace/public-library-backed-workspace";
import componentStyles from "./private-song-backed-workspace.module.css";

export function PrivateSongBackedWorkspace({
  id,
  binderId,
  binderItemId,
}: {
  id: string;
  binderId?: string;
  binderItemId?: string;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const songs = useQuery(api.songs.listMySongs, isAuthenticated ? {} : "skip");
  const validBinderId = binderId && /^[a-zA-Z0-9_-]+$/.test(binderId) ? binderId : null;
  const binder = useQuery(api.binders.get, isAuthenticated && validBinderId ? { id: validBinderId } : "skip");

  if (isLoading || (isAuthenticated && (songs === undefined || (validBinderId && binder === undefined)))) {
    return <main className={componentStyles.loadingPage} role="status">Loading song…</main>;
  }

  const song = songs?.find((candidate) => candidate._id === id);
  if (!song) {
    return (
      <main className={componentStyles.notFoundPage}>
        <div className={componentStyles.notFoundContent}>
          <h1 className={componentStyles.notFoundTitle}>Song not found</h1>
          <Link className={componentStyles.backToLibraryLink} href="/mylibrary">Back to My Library</Link>
        </div>
      </main>
    );
  }

  const binderItem = binder?.items.find((item) => (item._id === binderItemId || (item.legacySetListItemId !== undefined && item.legacySetListItemId === binderItemId)) && item.songId === song._id);

  return (
    <PublicLibraryBackedWorkspace
      clerkConfigured
      persistenceEnabled
      initialDisplaySettings={binderItem?.displaySettings}
      initialPrivateSong={{
        id: song._id,
        title: song.title,
        abc: song.abc,
        abcParts: song.abcParts,
        content: song.content,
        publicationState: song.publicationState,
        publicationTerritory: song.publicationTerritory,
      }}
      binderReturn={binder && binderItem ? {
        href: `/setlists/${encodeURIComponent(binder._id)}`,
        name: binder.name,
        binderId: binder._id,
        itemId: binderItem._id,
        songId: song._id,
      } : undefined}
    />
  );
}
