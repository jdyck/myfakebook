"use client";

import { useEffect, useRef, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { X } from "lucide-react";
import Link from "next/link";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { BinderSong } from "@/lib/songs/types";
import { type SongDisplaySettings } from "@/lib/notation/abc-display";
import componentStyles from "@/components/shared/song-actions.module.css";

export function SaveToBinderButton({
  enabled,
  song,
  onStatus,
}: {
  enabled: boolean;
  song: BinderSong | null;
  onStatus: (status: string) => void;
}) {
  if (!enabled || !song) return null;
  return <ConnectedSaveToBinderButton onStatus={onStatus} song={song} />;
}

function ConnectedSaveToBinderButton({
  song,
  onStatus,
}: {
  song: BinderSong;
  onStatus: (status: string) => void;
}) {
  const { isAuthenticated } = useConvexAuth();
  const binders = useQuery(api.binders.listMine, isAuthenticated ? {} : "skip");
  const addSong = useMutation(api.binders.addSong);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [savingBinderId, setSavingBinderId] = useState<Id<"binders"> | null>(null);
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

  async function handleAddToBinder(binderId: Id<"binders">, binderName: string) {
    setSavingBinderId(binderId);
    setError(null);
    try {
      await addSong({ binderId: binderId, songId: song.id });
      onStatus(`${song.title} added to ${binderName}`);
      closeDialog();
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Couldn’t add song to binder");
    } finally {
      setSavingBinderId(null);
    }
  }

  return (
    <>
      <button
        aria-haspopup="dialog"
        className={componentStyles.songLibraryActionButton}
        disabled={savingBinderId !== null}
        type="button"
        onClick={() => {
          setError(null);
          setIsOpen(true);
        }}
      >
        {savingBinderId ? "Adding…" : "Add to Binder"}
      </button>
      <dialog
        aria-labelledby={`add-to-binder-title-${song.id}`}
        className={componentStyles.binderDialog}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
        onClose={() => setIsOpen(false)}
        ref={dialogRef}
      >
        <section className={componentStyles.binderDialogContent}>
          <header className={componentStyles.binderDialogHeader}>
            <div className={componentStyles.songDetails}>
              <h2 className={componentStyles.binderDialogTitle} id={`add-to-binder-title-${song.id}`}>Add to a binder</h2>
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
          <div className={componentStyles.binderDialogBody}>
            {binders === undefined ? (
              <p className={componentStyles.binderLoadingMessage} role="status">Loading your binders…</p>
            ) : binders.length ? (
              <ul className={componentStyles.binderOptionList}>
                {binders.map((binder) => {
                  const alreadyAdded = binder.songIds.some((songId) => String(songId) === String(song.id));
                  const isSavingThisList = savingBinderId === binder._id;
                  return (
                    <li key={binder._id}>
                      <button
                        className={componentStyles.binderOptionButton}
                        disabled={alreadyAdded || savingBinderId !== null}
                        onClick={() => void handleAddToBinder(binder._id, binder.name)}
                        type="button"
                      >
                        <span className={componentStyles.songDetails}>
                          <span className={componentStyles.binderOptionName}>{binder.name}</span>
                          <span className={componentStyles.binderOptionMetadata}>{binder.itemCount} song{binder.itemCount === 1 ? "" : "s"} · Updated {new Date(binder.updatedAt).toLocaleDateString()}</span>
                        </span>
                        <span className={componentStyles.binderOptionActionLabel}>
                          {isSavingThisList ? "Adding…" : alreadyAdded ? "Already added" : "Add song"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className={componentStyles.emptyBindersState}>
                <p className={componentStyles.emptyStateTitle}>No binders yet</p>
                <p className={componentStyles.emptyStateDescription}>Create a binder before adding this song.</p>
                <Link className={componentStyles.createBinderLink} href="/binders">Create a binder</Link>
              </div>
            )}
            {error && <p className={componentStyles.dialogErrorMessage} role="alert">{error}</p>}
          </div>
        </section>
      </dialog>
    </>
  );
}

export function SaveBinderDisplaySettingsButton({
  binderId,
  itemId,
  displaySettings,
  onStatus,
}: {
  binderId: Id<"binders">;
  itemId: Id<"binderItems">;
  displaySettings: SongDisplaySettings;
  onStatus: (status: string) => void;
}) {
  return <ConnectedSaveBinderDisplaySettingsButton displaySettings={displaySettings} itemId={itemId} onStatus={onStatus} binderId={binderId} />;
}

function ConnectedSaveBinderDisplaySettingsButton({
  binderId,
  itemId,
  displaySettings,
  onStatus,
}: {
  binderId: Id<"binders">;
  itemId: Id<"binderItems">;
  displaySettings: SongDisplaySettings;
  onStatus: (status: string) => void;
}) {
  const updateDisplaySettings = useMutation(api.binders.updateDisplaySettings);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateDisplaySettings({ binderId: binderId, itemId, displaySettings });
      onStatus("Binder settings saved");
    } catch (error) {
      onStatus(error instanceof Error ? error.message : "Couldn’t save binder settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      className={componentStyles.saveBinderSettingsButton}
      disabled={saving}
      onClick={() => void handleSave()}
      type="button"
    >
      {saving ? "Saving…" : "Save settings"}
    </button>
  );
}
