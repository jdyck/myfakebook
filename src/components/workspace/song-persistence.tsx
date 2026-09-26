"use client";

import { useEffect, useRef, useState } from "react";
import { Authenticated, Unauthenticated, useConvexAuth, useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { SongDisplaySettings } from "@/lib/abc-display";
import componentStyles from "./song-persistence.module.css";

export type SongId = Id<"songs">;

export type LoadedSong = {
  id: SongId;
  title: string;
  abc: string;
  publicationState: "private" | "published";
};

export type SetListSong = { id: Id<"songs">; title: string };

type MyLibrarySongsProps = {
  title: string;
  abc: string;
  isPublicSong: boolean;
  currentSong: LoadedSong | null;
  recentSongIds: readonly string[];
  onCurrentSongChange: (song: LoadedSong | null) => void;
  onMySongsChange: (songs: LoadedSong[]) => void;
  onStatus: (status: string) => void;
  onLoad: (song: LoadedSong) => void;
};

export function MyLibrarySongs({
  enabled,
  ...props
}: MyLibrarySongsProps & { enabled: boolean }) {
  if (!enabled) return null;
  return <ConnectedMyLibrarySongs {...props} />;
}

function ConnectedMyLibrarySongs({
  title,
  abc,
  isPublicSong,
  currentSong,
  recentSongIds,
  onCurrentSongChange,
  onMySongsChange,
  onStatus,
  onLoad,
}: MyLibrarySongsProps) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const saveSong = useMutation(api.songs.save);
  const songs = useQuery(api.songs.listMySongs, isAuthenticated ? {} : "skip");
  const songId = useRef<SongId | undefined>(undefined);
  const mySongsRef = useRef<LoadedSong[]>([]);
  const songsRef = useRef(songs);
  const currentSongRef = useRef(currentSong);
  const statusRef = useRef(onStatus);
  const persistenceReady = isAuthenticated && songs !== undefined;
  const recentSongs = recentSongIds
    .slice()
    .reverse()
    .flatMap((songId) => {
      const song = songs?.find((candidate) => candidate._id === songId);
      return song ? [song] : [];
    })
    .slice(0, 5);

  useEffect(() => {
    statusRef.current = onStatus;
  }, [onStatus]);

  useEffect(() => {
    songsRef.current = songs;
  }, [songs]);

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  useEffect(() => {
    if (!songs) return;
    const nextSongs = songs.map((song) => ({
      id: song._id,
      title: song.title,
      abc: song.abc,
      publicationState: song.publicationState,
    }));
    const songsChanged =
      nextSongs.length !== mySongsRef.current.length ||
      nextSongs.some((song, index) => {
        const previous = mySongsRef.current[index];
        return !previous || previous.id !== song.id || previous.title !== song.title || previous.abc !== song.abc || previous.publicationState !== song.publicationState;
      });
    if (!songsChanged) return;
    mySongsRef.current = nextSongs;
    onMySongsChange(nextSongs);
  }, [onMySongsChange, songs]);

  useEffect(() => {
    if (!persistenceReady || isPublicSong) return;

    if (!songId.current) {
      const existingSong = songs.find((song) => song.title === title && song.abc === abc);
      songId.current = existingSong?._id;
      if (existingSong) {
        onCurrentSongChange({ id: existingSong._id, title: existingSong.title, abc: existingSong.abc, publicationState: existingSong.publicationState });
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
    let active = true;
    statusRef.current("Saving…");
    const timeout = window.setTimeout(async () => {
      try {
        const savedId = await saveSong({
          id: songId.current,
          title,
          abc,
        });
        if (!active) return;
        songId.current = savedId;
        const existingSong = songsRef.current?.find((song) => song._id === savedId);
        onCurrentSongChange({ id: savedId, title, abc, publicationState: currentSongRef.current?.publicationState ?? existingSong?.publicationState ?? "private" });
        statusRef.current("Saved to My Library");
      } catch {
        if (active) statusRef.current("Couldn’t sync");
      }
    }, 850);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [abc, isAuthenticated, isPublicSong, onCurrentSongChange, persistenceReady, saveSong, title]);

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
    <section className={componentStyles.style0} aria-labelledby="recent-songs-heading">
      <h2 className={componentStyles.style1} id="recent-songs-heading">
        Recently viewed songs
      </h2>
      <Authenticated>
        {songs === undefined ? (
          <p className={componentStyles.style2} role="status">
            Loading your songs…
          </p>
        ) : recentSongs.length ? (
          <div className={componentStyles.style3} aria-label="Recently viewed songs">
            {recentSongs.map((song) => (
              <div className={componentStyles.style4} key={song._id}>
                <Link
                  aria-current={currentSong?.id === song._id ? "page" : undefined}
                  className={componentStyles.style5}
                  href={`/mylibrary/${encodeURIComponent(song._id)}`}
                  onClick={() => {
                    const loadedSong = { id: song._id, title: song.title, abc: song.abc, publicationState: song.publicationState };
                    songId.current = song._id;
                    onCurrentSongChange(loadedSong);
                    onLoad(loadedSong);
                    statusRef.current("Loaded from My Library");
                  }}
                >
                  <span className={componentStyles.style6}>
                    ♪
                  </span>
                  <span className={componentStyles.style7}>
                    <span className={componentStyles.style8}>{song.title}</span>
                    <span className={componentStyles.style9}>
                      {song.publicationState === "published" ? "Published · " : "Private · "}
                      {new Date(song.updatedAt).toLocaleDateString()}
                    </span>
                  </span>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className={componentStyles.style2}>
            Songs you open will appear here.
          </div>
        )}
        <Link
          className={componentStyles.style10}
          href="/mylibrary"
        >
          All my songs
        </Link>
      </Authenticated>
      <Unauthenticated>
        <div className={componentStyles.style2}>
          <Link
            className={componentStyles.style11}
            href="/sign-in"
          >
            Sign in
          </Link>{" "}
          to sync your songs across devices.
        </div>
      </Unauthenticated>
    </section>
  );
}

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
      className={componentStyles.style12}
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
      className={componentStyles.style13}
      disabled={savingCopy}
      type="button"
      onClick={() => void handleSaveToMyLibrary()}
    >
      {savingCopy ? "Saving…" : ownedSource ? "Edit in My Library" : "Save to My Library"}
    </button>
  );
}

export function SaveToSetListButton({
  enabled,
  song,
  onStatus,
}: {
  enabled: boolean;
  song: SetListSong | null;
  onStatus: (status: string) => void;
}) {
  if (!enabled || !song) return null;
  return <ConnectedSaveToSetListButton onStatus={onStatus} song={song} />;
}

function ConnectedSaveToSetListButton({
  song,
  onStatus,
}: {
  song: SetListSong;
  onStatus: (status: string) => void;
}) {
  const { isAuthenticated } = useConvexAuth();
  const setLists = useQuery(api.setLists.listMine, isAuthenticated ? {} : "skip");
  const addSong = useMutation(api.setLists.addSong);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [savingSetListId, setSavingSetListId] = useState<Id<"setLists"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  if (!isAuthenticated) return null;

  function closeDialog() {
    if (dialogRef.current?.open) dialogRef.current.close();
    setIsOpen(false);
  }

  async function handleAddToSetList(setListId: Id<"setLists">, setListName: string) {
    setSavingSetListId(setListId);
    setError(null);
    try {
      await addSong({ setListId, songId: song.id });
      onStatus(`${song.title} added to ${setListName}`);
      closeDialog();
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Couldn’t add song to set list");
    } finally {
      setSavingSetListId(null);
    }
  }

  return (
    <>
      <button
        aria-haspopup="dialog"
        className={componentStyles.style13}
        disabled={savingSetListId !== null}
        type="button"
        onClick={() => {
          setError(null);
          setIsOpen(true);
        }}
      >
        {savingSetListId ? "Adding…" : "Add to Set List"}
      </button>
      <dialog
        aria-labelledby={`add-to-set-list-title-${song.id}`}
        className={componentStyles.style14}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
        onClose={() => setIsOpen(false)}
        ref={dialogRef}
      >
        <section className={componentStyles.style15}>
          <header className={componentStyles.style16}>
            <div className={componentStyles.style7}>
              <h2 className={componentStyles.style17} id={`add-to-set-list-title-${song.id}`}>Add to a set list</h2>
              <p className={componentStyles.style18} title={song.title}>{song.title}</p>
            </div>
            <button
              aria-label="Close"
              autoFocus
              className={componentStyles.style19}
              onClick={closeDialog}
              type="button"
            >
              <X aria-hidden="true" size={15} />
            </button>
          </header>
          <div className={componentStyles.style20}>
            {setLists === undefined ? (
              <p className={componentStyles.style21} role="status">Loading your set lists…</p>
            ) : setLists.length ? (
              <ul className={componentStyles.style22}>
                {setLists.map((setList) => {
                  const alreadyAdded = setList.songIds.some((songId) => String(songId) === String(song.id));
                  const isSavingThisList = savingSetListId === setList._id;
                  return (
                    <li key={setList._id}>
                      <button
                        className={componentStyles.style23}
                        disabled={alreadyAdded || savingSetListId !== null}
                        onClick={() => void handleAddToSetList(setList._id, setList.name)}
                        type="button"
                      >
                        <span className={componentStyles.style7}>
                          <span className={componentStyles.style24}>{setList.name}</span>
                          <span className={componentStyles.style25}>{setList.itemCount} song{setList.itemCount === 1 ? "" : "s"} · Updated {new Date(setList.updatedAt).toLocaleDateString()}</span>
                        </span>
                        <span className={componentStyles.style26}>
                          {isSavingThisList ? "Adding…" : alreadyAdded ? "Already added" : "Add song"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className={componentStyles.style27}>
                <p className={componentStyles.style28}>No set lists yet</p>
                <p className={componentStyles.style29}>Create a set list before adding this song.</p>
                <Link className={componentStyles.style30} href="/setlists">Create a set list</Link>
              </div>
            )}
            {error && <p className={componentStyles.style31} role="alert">{error}</p>}
          </div>
        </section>
      </dialog>
    </>
  );
}

export function SaveSetListDisplaySettingsButton({
  setListId,
  itemId,
  displaySettings,
  onStatus,
}: {
  setListId: Id<"setLists">;
  itemId: Id<"setListItems">;
  displaySettings: SongDisplaySettings;
  onStatus: (status: string) => void;
}) {
  return <ConnectedSaveSetListDisplaySettingsButton displaySettings={displaySettings} itemId={itemId} onStatus={onStatus} setListId={setListId} />;
}

function ConnectedSaveSetListDisplaySettingsButton({
  setListId,
  itemId,
  displaySettings,
  onStatus,
}: {
  setListId: Id<"setLists">;
  itemId: Id<"setListItems">;
  displaySettings: SongDisplaySettings;
  onStatus: (status: string) => void;
}) {
  const updateDisplaySettings = useMutation(api.setLists.updateDisplaySettings);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateDisplaySettings({ setListId, itemId, displaySettings });
      onStatus("Set-list settings saved");
    } catch (error) {
      onStatus(error instanceof Error ? error.message : "Couldn’t save set-list settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      className={componentStyles.style32}
      disabled={saving}
      onClick={() => void handleSave()}
      type="button"
    >
      {saving ? "Saving…" : "Save set-list settings"}
    </button>
  );
}

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
      className={componentStyles.style33}
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
      className={componentStyles.style33}
      disabled={changing}
      type="button"
      onClick={() => void handleUnpublish()}
    >
      {changing ? "Unpublishing…" : "Unpublish"}
    </button>
  );
}
