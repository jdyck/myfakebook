"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";

import { api } from "../../../../convex/_generated/api";
import type { LoadedSong, SongId } from "@/components/songs/types";
import componentStyles from "@/components/shared/song-actions.module.css";

export function AdminPublicationButton({
  enabled,
  song,
  onChanged,
  onStatus,
}: {
  enabled: boolean;
  song: LoadedSong | null;
  onChanged: (song: LoadedSong) => void;
  onStatus: (status: string) => void;
}) {
  if (!enabled || !song) return null;
  return <ConnectedAdminPublicationButton onChanged={onChanged} onStatus={onStatus} song={song} />;
}

function ConnectedAdminPublicationButton({
  song,
  onChanged,
  onStatus,
}: {
  song: LoadedSong;
  onChanged: (song: LoadedSong) => void;
  onStatus: (status: string) => void;
}) {
  const { user } = useUser();
  const publish = useMutation(api.songs.publish);
  const unpublish = useMutation(api.songs.unpublish);
  const [changing, setChanging] = useState(false);
  const isAdmin = user?.publicMetadata?.role === "admin";
  const isPublished = song.publicationState === "published";

  if (!isAdmin) return null;

  async function handleChange() {
    setChanging(true);
    onStatus(isPublished ? "Unpublishing…" : "Publishing…");
    try {
      await (isPublished ? unpublish : publish)({ id: song.id });
      onChanged({ ...song, publicationState: isPublished ? "private" : "published" });
      onStatus(isPublished ? "Song is private" : "Published to Public Library");
    } catch {
      onStatus(isPublished ? "Couldn’t unpublish" : "Couldn’t publish");
    } finally {
      setChanging(false);
    }
  }

  return (
    <button
      aria-label={`${isPublished ? "Unpublish" : "Publish"} ${song.title}`}
      className={componentStyles.publicationButton}
      disabled={changing}
      type="button"
      onClick={() => void handleChange()}
    >
      {changing ? (isPublished ? "Unpublishing…" : "Publishing…") : isPublished ? "Unpublish" : "Publish"}
    </button>
  );
}

export function AdminUnpublishPublicSongButton({
  enabled,
  songId,
  onStatus,
}: {
  enabled: boolean;
  songId: SongId | null;
  onStatus: (status: string) => void;
}) {
  if (!enabled || !songId) return null;
  return <ConnectedAdminUnpublishPublicSongButton songId={songId} onStatus={onStatus} />;
}

function ConnectedAdminUnpublishPublicSongButton({
  songId,
  onStatus,
}: {
  songId: SongId;
  onStatus: (status: string) => void;
}) {
  const { user } = useUser();
  const router = useRouter();
  const unpublish = useMutation(api.songs.unpublish);
  const [changing, setChanging] = useState(false);
  const isAdmin = user?.publicMetadata?.role === "admin";

  if (!isAdmin) return null;

  async function handleUnpublish() {
    setChanging(true);
    onStatus("Unpublishing…");
    try {
      await unpublish({ id: songId });
      onStatus("Song is private");
      router.push(`/mylibrary/${encodeURIComponent(songId)}`);
    } catch {
      onStatus("Couldn’t unpublish");
    } finally {
      setChanging(false);
    }
  }

  return (
    <button
      aria-label="Unpublish public song"
      className={componentStyles.publicationButton}
      disabled={changing}
      type="button"
      onClick={() => void handleUnpublish()}
    >
      {changing ? "Unpublishing…" : "Unpublish"}
    </button>
  );
}
