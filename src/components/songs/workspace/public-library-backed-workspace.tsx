"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { SongWorkspace } from "@/components/songs/workspace/song-workspace";
import type { LoadedSong } from "@/lib/songs/types";
import type { SongDisplaySettings } from "@/lib/notation/abc-display";
import { usePublicSongs } from "@/components/library/public-library/use-public-songs";
import componentStyles from "./public-library-backed-workspace.module.css";

type PublicLibraryBackedWorkspaceProps = {
  clerkConfigured: boolean;
  persistenceEnabled: boolean;
  initialPublicSongId?: string;
  initialPrivateSong?: LoadedSong;
  initialDisplaySettings?: SongDisplaySettings;
  binderId?: string;
  binderItemId?: string;
  binderReturn?: {
    href: string;
    name: string;
    binderId: Id<"binders">;
    itemId: Id<"binderItems">;
    songId: Id<"songs">;
  };
};

export function PublicLibraryBackedWorkspace(props: PublicLibraryBackedWorkspaceProps) {
  return props.clerkConfigured
    ? <AdminAwarePublicLibraryBackedWorkspace {...props} />
    : <ConnectedPublicLibraryBackedWorkspace {...props} isAdmin={false} />;
}

function AdminAwarePublicLibraryBackedWorkspace(props: PublicLibraryBackedWorkspaceProps) {
  const { user } = useUser();
  return <ConnectedPublicLibraryBackedWorkspace {...props} isAdmin={user?.publicMetadata?.role === "admin"} />;
}

function ConnectedPublicLibraryBackedWorkspace({
  clerkConfigured,
  persistenceEnabled,
  initialPublicSongId,
  initialPrivateSong,
  initialDisplaySettings,
  binderId,
  binderItemId,
  binderReturn,
  isAdmin,
}: PublicLibraryBackedWorkspaceProps & { isAdmin: boolean }) {
  const { isAuthenticated } = useConvexAuth();
  const { songs: publishedSongs, loading: publicSongsLoading } = usePublicSongs({ isAdmin });
  const validBinderId = binderId && /^[a-zA-Z0-9_-]+$/.test(binderId) ? binderId : null;
  const binder = useQuery(api.binders.get, isAuthenticated && validBinderId ? { id: validBinderId } : "skip");

  if (publicSongsLoading || !publishedSongs) {
    return (
      <main className={componentStyles.loadingPage}>
        <p className={componentStyles.loadingStatus} role="status">
          Loading Public Library…
        </p>
      </main>
    );
  }

  const initialSong = publishedSongs.find((song) => song.id === initialPublicSongId || song.catalogId === initialPublicSongId);
  const binderItem = binder?.items.find((item) => (item._id === binderItemId || (item.legacySetListItemId !== undefined && item.legacySetListItemId === binderItemId)) && item.songId === initialSong?.id);
  const resolvedBinderReturn = binderReturn ?? (binder && binderItem && validBinderId ? {
    href: `/binders/${encodeURIComponent(binder._id)}`,
    name: binder.name,
    binderId: binder._id,
    itemId: binderItem._id,
    songId: binderItem.songId,
  } : undefined);
  const resolvedDisplaySettings = initialDisplaySettings ?? binderItem?.displaySettings;

  if (initialPublicSongId && !initialSong) {
    return (
      <main className={componentStyles.notFoundPage}>
        <div className={componentStyles.notFoundContent}>
          <h1 className={componentStyles.notFoundTitle}>Song not found</h1>
          <Link className={componentStyles.browseSongsLink} href="/songs">Browse songs</Link>
        </div>
      </main>
    );
  }

  return (
    <SongWorkspace
      key={`${initialPrivateSong?.id ?? initialSong?.id ?? "default"}:${JSON.stringify(resolvedDisplaySettings ?? null)}:${resolvedBinderReturn?.href ?? ""}`}
      publicLibraryIsPersisted={publishedSongs.length > 0}
      clerkConfigured={clerkConfigured}
      persistenceEnabled={persistenceEnabled}
      publishedSongs={publishedSongs}
      initialPublicSongId={initialSong?.id}
      initialPrivateSong={initialPrivateSong}
      initialDisplaySettings={resolvedDisplaySettings}
      binderReturn={resolvedBinderReturn}
    />
  );
}
