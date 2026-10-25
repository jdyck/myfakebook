"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import Link from "next/link";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { BinderSong } from "@/lib/songs/types";
import componentStyles from "@/components/shared/song-actions.module.css";

export function SaveToBinderView({ song, binders, addSong, onStatus }: {
  song: BinderSong;
  binders: FunctionReturnType<typeof api.binders.listMine> | undefined;
  addSong: (args: FunctionArgs<typeof api.binders.addSong>) => Promise<unknown>;
  onStatus: (status: string) => void;
}) {
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

