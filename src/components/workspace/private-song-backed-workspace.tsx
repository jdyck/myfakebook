"use client";

import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PublicLibraryBackedWorkspace } from "@/components/workspace/public-library-backed-workspace";

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
  const validSetListId = setListId && /^[a-zA-Z0-9_-]+$/.test(setListId) ? setListId as Id<"setLists"> : null;
  const setList = useQuery(api.setLists.get, isAuthenticated && validSetListId ? { id: validSetListId } : "skip");

  if (isLoading || (isAuthenticated && (songs === undefined || (validSetListId && setList === undefined)))) {
    return <main className="grid min-h-screen place-items-center" role="status">Loading song…</main>;
  }

  const song = songs?.find((candidate) => candidate._id === id);
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

  const setListItem = setList?.items.find((item) => item._id === setListItemId && item.songId === song._id);

  return (
    <PublicLibraryBackedWorkspace
      clerkConfigured
      persistenceEnabled
      initialDisplaySettings={setListItem?.displaySettings}
      initialPrivateSong={{ id: song._id, title: song.title, abc: song.abc, publicationState: song.publicationState }}
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
