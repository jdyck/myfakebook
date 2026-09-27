"use client";

import { useEffect, useRef, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { X } from "lucide-react";
import Link from "next/link";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { SetListSong } from "@/components/songs/types";
import { type SongDisplaySettings } from "@/lib/abc-display";
import componentStyles from "@/components/shared/song-actions.module.css";

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
        className={componentStyles.songLibraryActionButton}
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
        className={componentStyles.setListDialog}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
        onClose={() => setIsOpen(false)}
        ref={dialogRef}
      >
        <section className={componentStyles.setListDialogContent}>
          <header className={componentStyles.setListDialogHeader}>
            <div className={componentStyles.songDetails}>
              <h2 className={componentStyles.setListDialogTitle} id={`add-to-set-list-title-${song.id}`}>Add to a set list</h2>
              <p className={componentStyles.dialogSongTitle} title={song.title}>{song.title}</p>
            </div>
            <button
              aria-label="Close"
              autoFocus
              className={componentStyles.closeDialogButton}
              onClick={closeDialog}
              type="button"
            >
              <X aria-hidden="true" size={15} />
            </button>
          </header>
          <div className={componentStyles.setListDialogBody}>
            {setLists === undefined ? (
              <p className={componentStyles.setListLoadingMessage} role="status">Loading your set lists…</p>
            ) : setLists.length ? (
              <ul className={componentStyles.setListOptionList}>
                {setLists.map((setList) => {
                  const alreadyAdded = setList.songIds.some((songId) => String(songId) === String(song.id));
                  const isSavingThisList = savingSetListId === setList._id;
                  return (
                    <li key={setList._id}>
                      <button
                        className={componentStyles.setListOptionButton}
                        disabled={alreadyAdded || savingSetListId !== null}
                        onClick={() => void handleAddToSetList(setList._id, setList.name)}
                        type="button"
                      >
                        <span className={componentStyles.songDetails}>
                          <span className={componentStyles.setListOptionName}>{setList.name}</span>
                          <span className={componentStyles.setListOptionMetadata}>{setList.itemCount} song{setList.itemCount === 1 ? "" : "s"} · Updated {new Date(setList.updatedAt).toLocaleDateString()}</span>
                        </span>
                        <span className={componentStyles.setListOptionActionLabel}>
                          {isSavingThisList ? "Adding…" : alreadyAdded ? "Already added" : "Add song"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className={componentStyles.emptySetListsState}>
                <p className={componentStyles.emptyStateTitle}>No set lists yet</p>
                <p className={componentStyles.emptyStateDescription}>Create a set list before adding this song.</p>
                <Link className={componentStyles.createSetListLink} href="/setlists">Create a set list</Link>
              </div>
            )}
            {error && <p className={componentStyles.dialogErrorMessage} role="alert">{error}</p>}
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
      className={componentStyles.saveSetListSettingsButton}
      disabled={saving}
      onClick={() => void handleSave()}
      type="button"
    >
      {saving ? "Saving…" : "Save set-list settings"}
    </button>
  );
}
