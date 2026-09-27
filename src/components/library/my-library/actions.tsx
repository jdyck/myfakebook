"use client";

import { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { api } from "../../../../convex/_generated/api";
import type { LoadedSong } from "@/components/songs/types";
import componentStyles from "@/components/shared/song-actions.module.css";

export function RemoveSongButton({
  enabled,
  song,
  onRemoved,
  onStatus,
}: {
  enabled: boolean;
  song: LoadedSong | null;
  onRemoved: () => void;
  onStatus: (status: string) => void;
}) {
  if (!enabled || !song) return null;
  return <ConnectedRemoveSongButton onRemoved={onRemoved} onStatus={onStatus} song={song} />;
}

function ConnectedRemoveSongButton({
  song,
  onRemoved,
  onStatus,
}: {
  song: LoadedSong;
  onRemoved: () => void;
  onStatus: (status: string) => void;
}) {
  const removeSong = useMutation(api.songs.remove);
  const router = useRouter();
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    onStatus("Removing from My Library…");
    try {
      await removeSong({ id: song.id });
      onRemoved();
      onStatus("Removed from My Library");
      router.push("/mylibrary");
    } catch {
      onStatus("Couldn’t remove from My Library");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <button
      aria-label={`Remove ${song.title} from My Library`}
      className={componentStyles.removeSongButton}
      disabled={removing}
      type="button"
      onClick={() => void handleRemove()}
    >
      <Trash2 size={13} strokeWidth={1.8} />
      {removing ? "Removing…" : "Remove"}
    </button>
  );
}

export function SaveToMyLibraryButton({
  enabled,
  title,
  abc,
  sourceSongId,
  onCurrentSongChange,
  onSavedToMyLibrary,
  onStatus,
}: {
  enabled: boolean;
  title: string;
  abc: string;
  sourceSongId: string | null;
  onCurrentSongChange: (song: LoadedSong | null) => void;
  onSavedToMyLibrary: () => void;
  onStatus: (status: string) => void;
}) {
  if (!enabled) return null;
  return (
    <ConnectedSaveToMyLibraryButton
      abc={abc}
      sourceSongId={sourceSongId}
      onCurrentSongChange={onCurrentSongChange}
      onSavedToMyLibrary={onSavedToMyLibrary}
      onStatus={onStatus}
      title={title}
    />
  );
}

function ConnectedSaveToMyLibraryButton({
  title,
  abc,
  sourceSongId,
  onCurrentSongChange,
  onSavedToMyLibrary,
  onStatus,
}: {
  title: string;
  abc: string;
  sourceSongId: string | null;
  onCurrentSongChange: (song: LoadedSong | null) => void;
  onSavedToMyLibrary: () => void;
  onStatus: (status: string) => void;
}) {
  const { isAuthenticated } = useConvexAuth();
  const saveSong = useMutation(api.songs.save);
  const songs = useQuery(api.songs.listMySongs, isAuthenticated ? {} : "skip");
  const [savingCopy, setSavingCopy] = useState(false);
  const persistenceReady = isAuthenticated && songs !== undefined;
  const ownedSource = songs?.find((song) => song._id === sourceSongId);

  if (!isAuthenticated) return null;

  async function handleSaveToMyLibrary() {
    if (!persistenceReady || !abc.trim()) return;

    setSavingCopy(true);
    onStatus("Saving to My Library…");
    try {
      const savedId = await saveSong({
        id: ownedSource?._id,
        title,
        abc,
      });
      const savedSong = songs?.find((song) => song._id === savedId);
      onCurrentSongChange({ id: savedId, title, abc, publicationState: savedSong?.publicationState ?? "private" });
      onSavedToMyLibrary();
      onStatus("Saved to My Library");
    } catch {
      onStatus("Couldn’t save to My Library");
    } finally {
      setSavingCopy(false);
    }
  }

  return (
    <button
      className={componentStyles.songLibraryActionButton}
      disabled={savingCopy}
      type="button"
      onClick={() => void handleSaveToMyLibrary()}
    >
      {savingCopy ? "Saving…" : ownedSource ? "Edit in My Library" : "Save to My Library"}
    </button>
  );
}
