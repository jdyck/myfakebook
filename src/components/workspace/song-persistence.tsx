"use client";

import { useEffect, useRef, useState } from "react";
import { Authenticated, Unauthenticated, useConvexAuth, useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { Trash2 } from "lucide-react";
import Link from "next/link";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export type PrivateSongId = Id<"privateSongs"> | Id<"scores">;
export type PublicSongId = Id<"publicSongs"> | Id<"catalogCharts">;

export type LoadedSong = {
  id: PrivateSongId;
  title: string;
  abc: string;
};

type PrivateLibrarySongsProps = {
  title: string;
  abc: string;
  isPublicSong: boolean;
  currentSong: LoadedSong | null;
  onCurrentSongChange: (song: LoadedSong | null) => void;
  onPrivateSongsChange: (songs: LoadedSong[]) => void;
  onStatus: (status: string) => void;
  onLoad: (song: LoadedSong) => void;
};

export function PrivateLibrarySongs({
  enabled,
  ...props
}: PrivateLibrarySongsProps & { enabled: boolean }) {
  if (!enabled) return null;
  return <ConnectedPrivateLibrarySongs {...props} />;
}

function ConnectedPrivateLibrarySongs({
  title,
  abc,
  isPublicSong,
  currentSong,
  onCurrentSongChange,
  onPrivateSongsChange,
  onStatus,
  onLoad,
}: PrivateLibrarySongsProps) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const savePrivateSong = useMutation(api.privateSongs.save);
  const songs = useQuery(api.privateSongs.listMine, isAuthenticated ? {} : "skip");
  const songId = useRef<PrivateSongId | undefined>(undefined);
  const privateSongsRef = useRef<LoadedSong[]>([]);
  const statusRef = useRef(onStatus);
  const persistenceReady = isAuthenticated && songs !== undefined;

  useEffect(() => {
    statusRef.current = onStatus;
  }, [onStatus]);

  useEffect(() => {
    if (!songs) return;
    const nextSongs = songs.map((song) => ({ id: song._id, title: song.title, abc: song.abc }));
    const songsChanged =
      nextSongs.length !== privateSongsRef.current.length ||
      nextSongs.some((song, index) => {
        const previous = privateSongsRef.current[index];
        return !previous || previous.id !== song.id || previous.title !== song.title || previous.abc !== song.abc;
      });
    if (!songsChanged) return;
    privateSongsRef.current = nextSongs;
    onPrivateSongsChange(nextSongs);
  }, [onPrivateSongsChange, songs]);

  useEffect(() => {
    if (!persistenceReady || isPublicSong) return;

    if (!songId.current) {
      const existingSong = songs.find((song) => song.title === title && song.abc === abc);
      songId.current = existingSong?._id;
      if (existingSong) {
        onCurrentSongChange({ id: existingSong._id, title: existingSong.title, abc: existingSong.abc });
      }
    }
  }, [abc, isPublicSong, onCurrentSongChange, persistenceReady, songs, title]);

  useEffect(() => {
    if (!isPublicSong) return;
    songId.current = undefined;
    onCurrentSongChange(null);
  }, [isPublicSong, onCurrentSongChange]);

  useEffect(() => {
    if (isPublicSong) return;
    songId.current = currentSong?.id;
  }, [currentSong?.id, isPublicSong]);

  useEffect(() => {
    if (
      !isAuthenticated ||
      !persistenceReady ||
      isPublicSong ||
      !abc.trim()
    ) {
      return;
    }
    statusRef.current("Saving…");
    const timeout = window.setTimeout(async () => {
      try {
        const savedId = await savePrivateSong({
          id: songId.current,
          title,
          abc,
          updatedAt: Date.now(),
        });
        songId.current = savedId;
        onCurrentSongChange({ id: savedId, title, abc });
        statusRef.current("Saved to Private Library");
      } catch {
        statusRef.current("Couldn’t sync");
      }
    }, 850);
    return () => window.clearTimeout(timeout);
  }, [abc, isAuthenticated, isPublicSong, onCurrentSongChange, persistenceReady, savePrivateSong, title]);

  useEffect(() => {
    if (!isAuthenticated) {
      songId.current = undefined;
      onCurrentSongChange(null);
    }
  }, [isAuthenticated, onCurrentSongChange]);

  useEffect(() => {
    if (isLoading) statusRef.current("Connecting…");
    if (!isLoading && (!isAuthenticated || isPublicSong)) statusRef.current("Not saved");
  }, [isAuthenticated, isLoading, isPublicSong]);

  return (
    <div className="mt-[17px] grid gap-[3px]" aria-label="Private Library songs">
      <Authenticated>
        {songs?.length ? (
          songs
            .filter(
              (song, index, allSongs) =>
                allSongs.findIndex((candidate) => candidate.title === song.title && candidate.abc === song.abc) === index,
            )
            .map((song) => (
              <div className="flex items-center gap-1" key={song._id}>
                <button
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-[9px] rounded-[8px] border-0 bg-transparent p-2 text-left transition-[background-color] duration-[160ms] ease-in-out hover:bg-[var(--paper-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed"
                  type="button"
                  onClick={() => {
                    const loadedSong = { id: song._id, title: song.title, abc: song.abc };
                    songId.current = song._id;
                    onCurrentSongChange(loadedSong);
                    onLoad(loadedSong);
                    statusRef.current("Loaded from Private Library");
                  }}
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-[6px] border border-[var(--accent-soft)] bg-[var(--accent-soft)] text-[13px] text-[var(--accent-deep)]">
                    ♪
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] font-[620] text-[var(--ink)]">{song.title}</span>
                    <span className="mt-0.5 block text-[10px] text-[var(--muted-soft)]">
                      {new Date(song.updatedAt).toLocaleDateString()}
                    </span>
                  </span>
                </button>
              </div>
            ))
        ) : (
          <div className="px-2 py-3.5 text-[10px] leading-[1.5] text-[var(--muted-soft)]">
            Your private songs will appear here.
          </div>
        )}
      </Authenticated>
      <Unauthenticated>
        <div className="px-2 py-3.5 text-[10px] leading-[1.5] text-[var(--muted-soft)]">
          <Link
            className="font-[650] text-[var(--accent-deep)] no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            href="/sign-in"
          >
            Sign in
          </Link>{" "}
          to sync your private songs across devices.
        </div>
      </Unauthenticated>
    </div>
  );
}

export function RemovePrivateSongButton({
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
  return <ConnectedRemovePrivateSongButton onRemoved={onRemoved} onStatus={onStatus} song={song} />;
}

function ConnectedRemovePrivateSongButton({
  song,
  onRemoved,
  onStatus,
}: {
  song: LoadedSong;
  onRemoved: () => void;
  onStatus: (status: string) => void;
}) {
  const removePrivateSong = useMutation(api.privateSongs.remove);
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    onStatus("Removing from Private Library…");
    try {
      await removePrivateSong({ id: song.id });
      onRemoved();
      onStatus("Removed from Private Library");
    } catch {
      onStatus("Couldn’t remove from Private Library");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <button
      aria-label={`Remove ${song.title} from Private Library`}
      className="inline-flex min-h-[31px] cursor-pointer items-center justify-center gap-1.5 rounded-[7px] border border-[var(--line-strong)] bg-[var(--paper)] px-2.5 text-[10px] font-[650] text-[var(--muted)] transition-[border-color,color,opacity] duration-[160ms] ease-in-out hover:border-[var(--accent)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-[0.55]"
      disabled={removing}
      type="button"
      onClick={() => void handleRemove()}
    >
      <Trash2 size={13} strokeWidth={1.8} />
      {removing ? "Removing…" : "Remove"}
    </button>
  );
}

export function SaveToPrivateLibraryButton({
  enabled,
  title,
  abc,
  onCurrentSongChange,
  onSavedToPrivateLibrary,
  onStatus,
}: {
  enabled: boolean;
  title: string;
  abc: string;
  onCurrentSongChange: (song: LoadedSong | null) => void;
  onSavedToPrivateLibrary: () => void;
  onStatus: (status: string) => void;
}) {
  if (!enabled) return null;
  return (
    <ConnectedSaveToPrivateLibraryButton
      abc={abc}
      onCurrentSongChange={onCurrentSongChange}
      onSavedToPrivateLibrary={onSavedToPrivateLibrary}
      onStatus={onStatus}
      title={title}
    />
  );
}

function ConnectedSaveToPrivateLibraryButton({
  title,
  abc,
  onCurrentSongChange,
  onSavedToPrivateLibrary,
  onStatus,
}: {
  title: string;
  abc: string;
  onCurrentSongChange: (song: LoadedSong | null) => void;
  onSavedToPrivateLibrary: () => void;
  onStatus: (status: string) => void;
}) {
  const { isAuthenticated } = useConvexAuth();
  const savePrivateSong = useMutation(api.privateSongs.save);
  const songs = useQuery(api.privateSongs.listMine, isAuthenticated ? {} : "skip");
  const [savingCopy, setSavingCopy] = useState(false);
  const persistenceReady = isAuthenticated && songs !== undefined;

  if (!isAuthenticated) return null;

  async function handleSaveToPrivateLibrary() {
    if (!persistenceReady || !abc.trim()) return;

    setSavingCopy(true);
    onStatus("Saving to Private Library…");
    try {
      const savedId = await savePrivateSong({
        title,
        abc,
        updatedAt: Date.now(),
      });
      onCurrentSongChange({ id: savedId, title, abc });
      onSavedToPrivateLibrary();
      onStatus("Saved to Private Library");
    } catch {
      onStatus("Couldn’t save to Private Library");
    } finally {
      setSavingCopy(false);
    }
  }

  return (
    <button
      className="inline-flex min-h-[32px] cursor-pointer items-center justify-center rounded-[7px] border border-[var(--accent)] bg-[var(--accent)] px-2.5 text-[10px] font-[680] text-white transition-[background-color,border-color,opacity] duration-[160ms] ease-in-out hover:border-[var(--accent-deep)] hover:bg-[var(--accent-deep)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-[0.55]"
      disabled={savingCopy}
      type="button"
      onClick={() => void handleSaveToPrivateLibrary()}
    >
      {savingCopy ? "Saving…" : "Save to Private Library"}
    </button>
  );
}

export function AdminPublishButton({
  enabled,
  song,
  onStatus,
}: {
  enabled: boolean;
  song: LoadedSong | null;
  onStatus: (status: string) => void;
}) {
  if (!enabled || !song) return null;
  return <ConnectedAdminPublishButton onStatus={onStatus} song={song} />;
}

export function AdminDeletePublicSongButton({
  enabled,
  publicSongId,
  onDeleted,
  onStatus,
}: {
  enabled: boolean;
  publicSongId: PublicSongId | null;
  onDeleted: () => void;
  onStatus: (status: string) => void;
}) {
  if (!enabled || !publicSongId) return null;
  return <ConnectedAdminDeletePublicSongButton publicSongId={publicSongId} onDeleted={onDeleted} onStatus={onStatus} />;
}

function ConnectedAdminDeletePublicSongButton({
  publicSongId,
  onDeleted,
  onStatus,
}: {
  publicSongId: PublicSongId;
  onDeleted: () => void;
  onStatus: (status: string) => void;
}) {
  const { user } = useUser();
  const removePublicSong = useMutation(api.publicSongs.remove);
  const [removing, setRemoving] = useState(false);
  const isAdmin = user?.publicMetadata?.role === "admin";

  if (!isAdmin) return null;

  async function handleRemove() {
    setRemoving(true);
    onStatus("Deleting from Public Library…");
    try {
      await removePublicSong({ id: publicSongId });
      onDeleted();
      onStatus("Deleted from Public Library");
    } catch {
      onStatus("Couldn’t delete from Public Library");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <button
      aria-label="Delete public song"
      className="inline-flex min-h-[31px] cursor-pointer items-center justify-center gap-1.5 rounded-[7px] border border-[var(--line-strong)] bg-[var(--paper)] px-2.5 text-[10px] font-[650] text-[var(--muted)] transition-[border-color,color,opacity] duration-[160ms] ease-in-out hover:border-[var(--accent)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-[0.55]"
      disabled={removing}
      type="button"
      onClick={() => void handleRemove()}
    >
      <Trash2 size={13} strokeWidth={1.8} />
      {removing ? "Deleting…" : "Delete"}
    </button>
  );
}

function ConnectedAdminPublishButton({
  song,
  onStatus,
}: {
  song: LoadedSong;
  onStatus: (status: string) => void;
}) {
  const { user } = useUser();
  const publishFromPrivateLibrary = useMutation(api.publicSongs.publishFromPrivateLibrary);
  const [publishing, setPublishing] = useState(false);
  const isAdmin = user?.publicMetadata?.role === "admin";

  if (!isAdmin) return null;

  async function handlePublish() {
    setPublishing(true);
    onStatus("Publishing…");
    try {
      await publishFromPrivateLibrary({ privateSongId: song.id });
      onStatus("Published to Public Library");
    } catch {
      onStatus("Couldn’t publish");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <button
      aria-label={`Publish ${song.title} to Public Library`}
      className="inline-flex min-h-[31px] cursor-pointer items-center justify-center rounded-[7px] border border-[var(--line-strong)] bg-[var(--paper)] px-2.5 text-[10px] font-[650] text-[var(--muted)] transition-[border-color,color,opacity] duration-[160ms] ease-in-out hover:border-[var(--accent)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-[0.55]"
      disabled={publishing}
      type="button"
      onClick={() => void handlePublish()}
    >
      {publishing ? "Publishing…" : "Publish"}
    </button>
  );
}
