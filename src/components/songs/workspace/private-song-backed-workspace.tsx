"use client";

import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";

import { api } from "../../../../convex/_generated/api";
import { PublicLibraryBackedWorkspace } from "@/components/songs/workspace/public-library-backed-workspace";
import componentStyles from "./private-song-backed-workspace.module.css";

export function PrivateSongBackedWorkspace({
  id,
  setListId,
  setListItemId,
}: {
  id: string;
  setListId?: string;
  setListItemId?: string;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const songs = useQuery(api.songs.listMySongs, isAuthenticated ? {} : "skip");
  const validSetListId = setListId && /^[a-zA-Z0-9_-]+$/.test(setListId) ? setListId : null;
  const setList = useQuery(api.binders.get, isAuthenticated && validSetListId ? { id: validSetListId } : "skip");

  if (isLoading || (isAuthenticated && (songs === undefined || (validSetListId && setList === undefined)))) {
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

  const setListItem = setList?.items.find((item) => (item._id === setListItemId || (item.legacySetListItemId !== undefined && item.legacySetListItemId === setListItemId)) && item.songId === song._id);

  return (
    <PublicLibraryBackedWorkspace
      clerkConfigured
      persistenceEnabled
      initialDisplaySettings={setListItem?.displaySettings}
      initialPrivateSong={{
        id: song._id,
        title: song.title,
        abc: song.abc,
        abcParts: song.abcParts,
        content: song.content,
        publicationState: song.publicationState,
        publicationTerritory: song.publicationTerritory,
      }}
      setListReturn={setList && setListItem ? {
        href: `/setlists/${encodeURIComponent(setList._id)}`,
        name: setList.name,
        setListId: setList._id,
        itemId: setListItem._id,
        songId: song._id,
      } : undefined}
    />
  );
}
