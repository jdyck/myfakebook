"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Combobox } from "@base-ui/react/combobox";
import Link from "next/link";
import { Check, GripVertical, Plus, Search, Settings, Trash2, X } from "lucide-react";

import type { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import titleStyles from "@/components/ui/page-title.module.css";
import libraryStyles from "@/components/library/editorial-library.module.css";
import { PreviewPanel } from "@/components/songs/preview/preview-panel";
import { DisplayControls } from "@/components/songs/workspace/display-controls";
import { DEFAULT_DISPLAY_SETTINGS, type SongDisplaySettings } from "@/lib/notation/abc-display";
import componentStyles from "./binder-detail.module.css";


import type { FunctionArgs, FunctionReturnType } from "convex/server";

function getDropTargetAtPoint(clientX: number, clientY: number) {
  const element = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>("[data-binder-item]");
  const itemId = element?.dataset.binderItem;
  if (!element || !itemId) return null;

  const bounds = element.getBoundingClientRect();
  return {
    itemId,
    position: clientY < bounds.top + bounds.height / 2 ? "before" as const : "after" as const,
  };
}

type AvailableSong = {
  songId: Id<"songs">;
  title: string;
  isPublic: boolean;
};

type BinderMutation<K extends "rename" | "remove" | "addSong" | "updateDisplaySettings" | "removeItem" | "reorder"> = (args: FunctionArgs<typeof api.binders[K]>) => Promise<FunctionReturnType<typeof api.binders[K]>>;
export type BinderDetailViewProps = {
  canPublish?: boolean;
  setPublished?: (args: { id: Id<"binders">; published: boolean }) => Promise<unknown>;
  binder: FunctionReturnType<typeof api.binders.get> | undefined;
  availableSongs: readonly AvailableSong[] | undefined;
  loading: boolean;
  header?: ReactNode;
  onDeleted: () => void;
  renameBinder: BinderMutation<"rename">;
  removeBinder: BinderMutation<"remove">;
  addSong: BinderMutation<"addSong">;
  updateDisplaySettings: BinderMutation<"updateDisplaySettings">;
  removeItem: BinderMutation<"removeItem">;
  reorder: BinderMutation<"reorder">;
};

export function BinderDetailView({ canPublish, setPublished, binder, availableSongs, loading, header, onDeleted, renameBinder, removeBinder, addSong, updateDisplaySettings, removeItem, reorder }: BinderDetailViewProps) {
  const validId = binder?._id ?? null;
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const nameDraft = useRef<string | null>(null);
  const savedName = useRef(binder?.name ?? "");
  const nameSaveTimeout = useRef<number | null>(null);
  const nameSaveInFlight = useRef(false);
  const pendingNameSave = useRef<string | null>(null);
  const [isAddSongDialogOpen, setIsAddSongDialogOpen] = useState(false);
  const [songSearch, setSongSearch] = useState("");
  const [selectedSongIds, setSelectedSongIds] = useState<Id<"songs">[]>([]);
  const [addSongError, setAddSongError] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [settingsByItem, setSettingsByItem] = useState<Record<string, SongDisplaySettings>>({});
  const pointerDrag = useRef<{
    pointerId: number;
    sourceId: string;
    title: string;
    startX: number;
    startY: number;
    clientX: number;
    clientY: number;
    width: number;
    active: boolean;
  } | null>(null);
  const autoScrollFrame = useRef<number | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ itemId: string; position: "before" | "after" } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ title: string; left: number; top: number; width: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const addSongDialogRef = useRef<HTMLDialogElement>(null);
  const addSongSearchRef = useRef<HTMLInputElement>(null);
  const addSongDialogId = useId();
  const addSongTitleId = useId();
  const addSongDescriptionId = useId();
  const addSongSearchId = useId();
  const savedBinderName = binder?.name ?? "";
  const name = nameOverride ?? binder?.name ?? "";
  const songsToAdd = availableSongs?.filter((song) => !binder?.items.some((item) => item.songId === song.songId)) ?? [];
  const selectedSongs = songsToAdd.filter((song) => selectedSongIds.includes(song.songId));
  const selectedItem = binder?.items.find((item) => item._id === selectedItemId) ?? binder?.items[0];
  const selectedSettings = selectedItem
    ? settingsByItem[selectedItem._id] ?? { ...DEFAULT_DISPLAY_SETTINGS, ...selectedItem.displaySettings }
    : DEFAULT_DISPLAY_SETTINGS;

  useEffect(() => {
    if (savedBinderName) savedName.current = savedBinderName;
  }, [savedBinderName]);

  useEffect(() => () => {
    if (nameSaveTimeout.current !== null) window.clearTimeout(nameSaveTimeout.current);
  }, []);

  async function runChange(action: () => Promise<unknown>, successMessage?: string, pendingMessage?: string) {
    setSaving(true);
    setStatus(pendingMessage ?? null);
    try {
      const result = await action();
      if (successMessage) setStatus(successMessage);
      return result;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Couldn’t update binder");
      return undefined;
    } finally {
      setSaving(false);
    }
  }

  async function saveBinderName(value: string) {
    if (!validId || !binder) return;
    const nextName = value.trim();
    if (!nextName) {
      setStatus("Enter a binder name");
      if (nameDraft.current === value) {
        nameDraft.current = null;
        setNameOverride(null);
      }
      return;
    }
    if (nextName === savedName.current) {
      if (nameDraft.current === value) {
        nameDraft.current = null;
        setNameOverride(null);
      }
      return;
    }
    if (nameSaveInFlight.current) {
      pendingNameSave.current = value;
      return;
    }

    nameSaveInFlight.current = true;
    const result = await runChange(
      () => renameBinder({ id: validId, name: nextName }),
      "Binder name saved",
      "Saving binder name…",
    );
    nameSaveInFlight.current = false;

    if (result !== undefined) {
      savedName.current = nextName;
      if (nameDraft.current === value) {
        nameDraft.current = null;
        setNameOverride(null);
      }
    } else if (nameDraft.current === value) {
      nameDraft.current = null;
      setNameOverride(null);
    }

    const pendingName = pendingNameSave.current;
    pendingNameSave.current = null;
    if (pendingName !== null) void saveBinderName(pendingName);
  }

  function handleBinderNameChange(value: string) {
    nameDraft.current = value;
    setNameOverride(value);
    if (nameSaveTimeout.current !== null) window.clearTimeout(nameSaveTimeout.current);
    nameSaveTimeout.current = window.setTimeout(() => {
      nameSaveTimeout.current = null;
      void saveBinderName(value);
    }, 600);
  }

  function handleBinderNameBlur(value: string) {
    if (nameSaveTimeout.current !== null) window.clearTimeout(nameSaveTimeout.current);
    nameSaveTimeout.current = null;
    void saveBinderName(value);
  }

  function openAddSongDialog() {
    setSongSearch("");
    setSelectedSongIds([]);
    setAddSongError(null);
    const dialog = addSongDialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    setIsAddSongDialogOpen(true);
    window.requestAnimationFrame(() => addSongSearchRef.current?.focus());
  }

  function closeAddSongDialog() {
    const dialog = addSongDialogRef.current;
    if (dialog?.open) dialog.close();
    setIsAddSongDialogOpen(false);
    setSongSearch("");
    setSelectedSongIds([]);
    setAddSongError(null);
  }

  async function handleAddSong(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validId || saving || !selectedSongs.length) return;
    setAddSongError(null);
    setSaving(true);
    const remaining = selectedSongs.map((song) => song.songId);
    try {
      // Add in sequence so the selected songs keep their order in the binder.
      for (const song of selectedSongs) {
        const itemId = await addSong({ binderId: validId, songId: song.songId });
        remaining.splice(remaining.indexOf(song.songId), 1);
        setSelectedSongIds([...remaining]);
        setSelectedItemId(itemId);
      }
      setStatus(`${selectedSongs.length} song${selectedSongs.length === 1 ? "" : "s"} added`);
      closeAddSongDialog();
    } catch (error) {
      setAddSongError(error instanceof Error ? error.message : "Couldn’t add the selected songs. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteBinder() {
    if (!validId || !window.confirm("Delete this binder? Its songs won’t be deleted.")) return;
    await runChange(async () => {
      await removeBinder({ id: validId });
      onDeleted();
    });
  }

  async function handleMove(itemIndex: number, offset: -1 | 1) {
    if (!validId || !binder) return;
    const next = [...binder.items];
    const target = itemIndex + offset;
    if (target < 0 || target >= next.length) return;
    [next[itemIndex], next[target]] = [next[target], next[itemIndex]];
    await runChange(
      () => reorder({ binderId: validId, itemIds: next.map((item) => item._id) }),
      `${next[target].title} moved to position ${target + 1}`,
    );
  }

  async function handleDrop(sourceId: string, targetId: string, position: "before" | "after") {
    setDraggedItemId(null);
    setDropTarget(null);
    if (!validId || !binder || saving || sourceId === targetId) return;

    const next = [...binder.items];
    const sourceIndex = next.findIndex((item) => item._id === sourceId);
    const targetIndex = next.findIndex((item) => item._id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const [movedItem] = next.splice(sourceIndex, 1);
    const adjustedTargetIndex = next.findIndex((item) => item._id === targetId);
    const insertionIndex = adjustedTargetIndex + (position === "after" ? 1 : 0);
    next.splice(insertionIndex, 0, movedItem);
    if (next.every((item, index) => item._id === binder.items[index]._id)) return;

    await runChange(
      () => reorder({ binderId: validId, itemIds: next.map((item) => item._id) }),
      `${movedItem.title} moved to position ${insertionIndex + 1}`,
      `Moving ${movedItem.title}…`,
    );
  }

  function updateDropTargetAtPoint(clientX: number, clientY: number, sourceId: string) {
    const target = getDropTargetAtPoint(clientX, clientY);
    const next = target && target.itemId !== sourceId ? target : null;
    setDropTarget((current) => (
      current?.itemId === next?.itemId && current?.position === next?.position ? current : next
    ));
  }

  function scheduleAutoScroll() {
    if (autoScrollFrame.current !== null) return;

    const tick = () => {
      const current = pointerDrag.current;
      if (!current?.active) {
        autoScrollFrame.current = null;
        return;
      }

      const edgeSize = 64;
      let scrollBy = 0;
      if (current.clientY < edgeSize) {
        scrollBy = -Math.max(4, Math.ceil((edgeSize - current.clientY) / 3));
      } else if (current.clientY > window.innerHeight - edgeSize) {
        scrollBy = Math.max(4, Math.ceil((current.clientY - (window.innerHeight - edgeSize)) / 3));
      }

      if (scrollBy === 0) {
        autoScrollFrame.current = null;
        return;
      }

      window.scrollBy(0, scrollBy);
      updateDropTargetAtPoint(current.clientX, current.clientY, current.sourceId);
      autoScrollFrame.current = window.requestAnimationFrame(tick);
    };

    autoScrollFrame.current = window.requestAnimationFrame(tick);
  }

  function clearPointerDrag() {
    pointerDrag.current = null;
    if (autoScrollFrame.current !== null) {
      window.cancelAnimationFrame(autoScrollFrame.current);
      autoScrollFrame.current = null;
    }
    setDraggedItemId(null);
    setDropTarget(null);
    setDragPreview(null);
  }

  async function handleDisplayChange(
    itemId: Id<"binderItems">,
    savedSettings: SongDisplaySettings,
    patch: Partial<SongDisplaySettings>,
  ) {
    if (!validId) return;
    const current = settingsByItem[itemId] ?? savedSettings;
    const next = { ...current, ...patch };
    setSettingsByItem((settings) => ({ ...settings, [itemId]: next }));
    await runChange(() => updateDisplaySettings({ binderId: validId, itemId, displaySettings: next }));
  }

  return (
    <div className={libraryStyles.pageShell}>
      <a className={libraryStyles.skipLink} href="#binder-main">Skip to binder</a>
      {header}
      <main id="binder-main" className={libraryStyles.pageContent}>
        {loading ? (
          <p className={componentStyles.loadingStatus} role="status">Loading binder…</p>
        ) : !binder ? (
          <section className={componentStyles.notFoundSection}>
            <Link className={componentStyles.backToBindersLink} href="/binders">← All binders</Link>
            <h1 className={componentStyles.notFoundTitle}>Binder not found</h1>
            <p className={componentStyles.notFoundDescription}>This binder may have been removed, or it may belong to another user.</p>
          </section>
        ) : (
          <>
            <section className={libraryStyles.pageHeading} aria-label="Binder details">
              <div className={componentStyles.titleAndDetails}>
                <Link className={componentStyles.binderBackLink} href="/binders">← All binders</Link>
                <h1 className={`${titleStyles.title} ${componentStyles.binderTitle}`}>{name}</h1>

              </div>
              <div className={libraryStyles.headingActions}>
                <span>{binder.published ? "Published" : "Private"}</span>
                <Dialog.Root open={isEditingName} onOpenChange={setIsEditingName}>
                  <Dialog.Trigger type="button" className={componentStyles.sharedButton} aria-label="Edit binder settings">
                    <Settings size={16} aria-hidden="true" />
                    Settings
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Backdrop className={componentStyles.settingsBackdrop} />
                    <Dialog.Popup className={componentStyles.settingsPopup}>
                      <header className={componentStyles.addSongDialogHeader}>
                        <div>
                          <Dialog.Title className={componentStyles.addSongDialogTitle}>Binder settings</Dialog.Title>
                          <Dialog.Description className={componentStyles.addSongDialogDescription}>Changes save automatically.</Dialog.Description>
                        </div>
                        <Dialog.Close className={`${componentStyles.sharedButton} ${componentStyles.closeAddSongDialog}`} aria-label="Close binder settings">
                          <X size={18} aria-hidden="true" />
                        </Dialog.Close>
                      </header>
                      <div className={componentStyles.addSongDialogBody}>
                        <div className={componentStyles.settingsNameField}>
                          <label htmlFor="binder-name">Binder name</label>
                          <input id="binder-name" autoFocus className={componentStyles.binderTitleInput} maxLength={80}
                            onBlur={(event) => handleBinderNameBlur(event.currentTarget.value)}
                            onChange={(event) => handleBinderNameChange(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key !== "Enter") return;
                              event.preventDefault();
                              event.currentTarget.blur();
                              setIsEditingName(false);
                            }}
                            value={name}
                          />
                        </div>
                        {canPublish && setPublished && <div className={componentStyles.settingsPublication}>
                          <p className={componentStyles.addSongDialogDescription}>
                            {binder.published ? "This binder is published. Visitors see only songs available to them." : "Publish this binder so others can view songs available in their location."}
                          </p>
                          <button type="button" className={componentStyles.sharedButton} disabled={saving}
                            onClick={() => void runChange(() => setPublished({ id: binder._id, published: !binder.published }), binder.published ? "Binder unpublished" : "Binder published")}>
                            {binder.published ? "Unpublish binder" : "Publish binder"}
                          </button>
                        </div>}
                        {status && <p className={componentStyles.actionStatusMessage} role="status">{status}</p>}
                      </div>
                      <footer className={componentStyles.addSongDialogActions}>
                        <Dialog.Close className={componentStyles.sharedButton}>Done</Dialog.Close>
                      </footer>
                    </Dialog.Popup>
                  </Dialog.Portal>
                </Dialog.Root>
              </div>
            </section>
            <div className={componentStyles.binderWorkspace}>
              <aside className={componentStyles.binderSidebar} aria-label="Binder songs and actions">

                <section className={componentStyles.binderSongsSection} aria-labelledby="binder-songs-heading">
                  <div className={componentStyles.songsSectionHeader}>
                    <h2 className={componentStyles.songsSectionTitle} id="binder-songs-heading">Songs</h2>
                    <span className={componentStyles.songCount}>{String(binder.items.length).padStart(2, "0")}</span>
                  </div>
                  {binder.items.length ? (
                    <ol className={componentStyles.orderedSongList} aria-label={`${binder.name} songs`}>
                      {binder.items.map((item, index) => {
                        const isSelected = selectedItem?._id === item._id;
                        const isDragged = draggedItemId === item._id;
                        const isDropTarget = dropTarget?.itemId === item._id;
                        return (
                          <li
                            className={`${componentStyles.orderedSongItem} ${isSelected ? componentStyles.selectedSongItem : componentStyles.unselectedSongItem} ${isDragged ? componentStyles.draggedSongItem : ""} ${isDropTarget ? componentStyles.dropTargetSongItem : ""}`}
                            data-binder-item={item._id}
                            key={item._id}
                          >
                            {isDropTarget && (
                              <span
                                aria-hidden="true"
                                className={`${componentStyles.dropIndicator} ${dropTarget.position === "before" ? componentStyles.dropIndicatorBefore : componentStyles.dropIndicatorAfter}`}
                              />
                            )}
                            <div className={componentStyles.songItemDragControls}>
                              <button
                                aria-keyshortcuts="ArrowUp ArrowDown"
                                aria-label={`Reorder ${item.title}; use the arrow keys to move`}
                                className={componentStyles.dragHandleButton}
                                disabled={saving}
                                onKeyDown={(event) => {
                                  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                                  event.preventDefault();
                                  void handleMove(index, event.key === "ArrowUp" ? -1 : 1);
                                }}
                                onPointerCancel={(event) => {
                                  if (pointerDrag.current?.pointerId !== event.pointerId) return;
                                  clearPointerDrag();
                                }}
                                onPointerDown={(event) => {
                                  if (event.button !== 0 || saving) return;
                                  const itemBounds = event.currentTarget.closest<HTMLElement>("[data-binder-item]")?.getBoundingClientRect();
                                  if (!itemBounds) return;
                                  pointerDrag.current = {
                                    pointerId: event.pointerId,
                                    sourceId: item._id,
                                    title: item.title,
                                    startX: event.clientX,
                                    startY: event.clientY,
                                    clientX: event.clientX,
                                    clientY: event.clientY,
                                    width: itemBounds.width,
                                    active: false,
                                  };
                                  event.currentTarget.setPointerCapture(event.pointerId);
                                }}
                                onPointerMove={(event) => {
                                  const current = pointerDrag.current;
                                  if (!current || current.pointerId !== event.pointerId) return;
                                  current.clientX = event.clientX;
                                  current.clientY = event.clientY;
                                  if (!current.active && Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < 6) return;

                                  if (!current.active) {
                                    current.active = true;
                                    setDraggedItemId(current.sourceId);
                                  }
                                  event.preventDefault();
                                  updateDropTargetAtPoint(event.clientX, event.clientY, current.sourceId);
                                  const width = Math.min(current.width, window.innerWidth - 16);
                                  setDragPreview({
                                    title: current.title,
                                    left: Math.max(8, Math.min(event.clientX + 16, window.innerWidth - width - 8)),
                                    top: Math.max(8, Math.min(event.clientY - 46, window.innerHeight - 44)),
                                    width,
                                  });
                                  scheduleAutoScroll();
                                }}
                                onPointerUp={(event) => {
                                  const current = pointerDrag.current;
                                  if (!current || current.pointerId !== event.pointerId) return;
                                  const target = current.active ? getDropTargetAtPoint(event.clientX, event.clientY) : null;
                                  clearPointerDrag();
                                  if (!current.active) return;
                                  if (target) void handleDrop(current.sourceId, target.itemId, target.position);
                                }}
                                type="button"
                              >
                                <GripVertical aria-hidden="true" size={14} />
                              </button>
                              <button
                                aria-pressed={isSelected}
                                className={componentStyles.songSelectionButton}
                                disabled={!item.canOpen || saving}
                                onClick={() => setSelectedItemId(item._id)}
                                type="button"
                              >
                                <span className={componentStyles.songPositionNumber}>{String(index + 1).padStart(2, "0")}</span>
                                <span className={componentStyles.titleAndDetails}>
                                  <span className={componentStyles.songName}>{item.title}</span>
                                  {!item.canOpen && <span className={componentStyles.unavailableBadge}>Unavailable</span>}
                                </span>
                              </button>
                              <div className={componentStyles.songItemActions}>
                                <button aria-label={`Remove ${item.title} from binder`} className={`${componentStyles.sharedButton} ${componentStyles.removeSongButton}`} disabled={saving} onClick={() => validId && void runChange(() => removeItem({ binderId: validId, itemId: item._id }), `${item.title} removed from binder`)} type="button"><Trash2 aria-hidden="true" size={14} /></button>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <p className={componentStyles.emptySongListMessage}>Add a song to start your set.</p>
                  )}
                  <p className={componentStyles.visuallyHidden} aria-live="polite" aria-atomic="true">
                    {draggedItemId && binder.items.find((item) => item._id === draggedItemId)
                      ? dropTarget
                        ? `${binder.items.find((item) => item._id === draggedItemId)?.title} will move ${dropTarget.position} ${binder.items.find((item) => item._id === dropTarget.itemId)?.title}.`
                        : `Moving ${binder.items.find((item) => item._id === draggedItemId)?.title}. Move over another song and release to place it.`
                      : ""}
                  </p>
                </section>

                <div className={componentStyles.binderFooterActions}>
                  <button
                    aria-controls={addSongDialogId}
                    aria-haspopup="dialog"
                    className={`${componentStyles.sharedPrimaryButton} ${componentStyles.addSongTrigger}`}
                    disabled={saving}
                    onClick={openAddSongDialog}
                    type="button"
                  >
                    <Plus aria-hidden="true" size={14} /> Add a song
                  </button>
                  <button className={`${componentStyles.sharedButton} ${componentStyles.deleteBinderButton}`} disabled={saving} onClick={() => void handleDeleteBinder()} type="button">
                    <Trash2 aria-hidden="true" size={13} /> Delete
                  </button>
                </div>
                <dialog
                  aria-describedby={addSongDescriptionId}
                  aria-labelledby={addSongTitleId}
                  className={componentStyles.addSongDialog}
                  id={addSongDialogId}
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !saving) closeAddSongDialog();
                  }}
                  onCancel={(event) => { if (saving) event.preventDefault(); }}
                  onClose={() => {
                    setIsAddSongDialogOpen(false);
                    setSongSearch("");
                    setSelectedSongIds([]);
                    setAddSongError(null);
                                  }}
                  ref={addSongDialogRef}
                >
                  <section className={componentStyles.addSongDialogContent}>
                    <header className={componentStyles.addSongDialogHeader}>
                      <div>
                        <h2 className={componentStyles.addSongDialogTitle} id={addSongTitleId}>Add songs</h2>
                        <p className={componentStyles.addSongDialogDescription} id={addSongDescriptionId}>Select songs to add to {binder.name}.</p>
                      </div>
                      <button
                        disabled={saving}
                        aria-label="Close add song dialog"
                        className={`${componentStyles.sharedButton} ${componentStyles.closeAddSongDialog}`}
                        onClick={closeAddSongDialog}
                        type="button"
                      >
                        <X aria-hidden="true" size={15} />
                      </button>
                    </header>
                    <form className={componentStyles.addSongDialogForm} onSubmit={(event) => void handleAddSong(event)}>
                      <div className={componentStyles.addSongDialogBody}>
                        {songsToAdd.length ? (
                          <Combobox.Root
                            multiple
                            disabled={saving}
                            autoComplete="off"
                            autoHighlight
                            inline
                            inputValue={songSearch}
                            isItemEqualToValue={(item: AvailableSong, value: AvailableSong) => item.songId === value.songId}
                            itemToStringLabel={(song: AvailableSong) => song.title}
                            itemToStringValue={(song: AvailableSong) => String(song.songId)}
                            items={songsToAdd}
                            onInputValueChange={(value) => {
                              setSongSearch(value);
                              setAddSongError(null);
                            }}
                            onValueChange={(songs: AvailableSong[]) => {
                              setSelectedSongIds(songs.map((song) => song.songId));
                              setAddSongError(null);
                            }}
                            open={isAddSongDialogOpen}
                            value={selectedSongs}
                          >
                            <label className={componentStyles.addSongSearchLabel} htmlFor={addSongSearchId}>Search songs</label>
                            <div className={componentStyles.addSongSearchBox}>
                              <Search aria-hidden="true" className={componentStyles.addSongSearchIcon} size={15} />
                              <Combobox.Input
                                id={addSongSearchId}
                                placeholder="Type a song title…"
                                ref={addSongSearchRef}
                                className={componentStyles.addSongSearchInput}
                              />
                            </div>
                            <Combobox.Empty>
                              <p className={componentStyles.addSongEmptyResult}>No songs match “{songSearch}”. Try another title.</p>
                            </Combobox.Empty>
                            <Combobox.List className={componentStyles.addSongResultList}>
                              {(song: AvailableSong) => (
                                <Combobox.Item className={componentStyles.addSongResult} key={song.songId} value={song}>
                                  <span className={componentStyles.addSongResultTitle}>{song.title}</span>
                                  <span className={componentStyles.addSongResultSource}>{song.isPublic ? "Public" : "My Library"}</span>
                                  <Combobox.ItemIndicator className={componentStyles.addSongResultIndicator}>
                                    <Check aria-hidden="true" size={15} />
                                  </Combobox.ItemIndicator>
                                </Combobox.Item>
                              )}
                            </Combobox.List>
                          </Combobox.Root>
                        ) : (
                          <div className={componentStyles.addSongEmptyState} role="status">
                            {availableSongs?.length ? (
                              "All available songs are already in this binder."
                            ) : (
                              <>
                                There are no songs to add yet. Create one or <Link className={componentStyles.browsePublicSongsLink} href="/songs">browse public songs</Link>.
                              </>
                            )}
                          </div>
                        )}
                        {addSongError && <p className={componentStyles.addSongError} role="alert">{addSongError}</p>}
                      </div>
                      <footer className={componentStyles.addSongDialogActions}>
                        <button className={componentStyles.sharedButton} disabled={saving} onClick={closeAddSongDialog} type="button">Cancel</button>
                        <button className={componentStyles.sharedPrimaryButton} disabled={saving || !selectedSongs.length} type="submit">
                          {saving ? "Adding…" : selectedSongs.length ? `Add ${selectedSongs.length} song${selectedSongs.length === 1 ? "" : "s"}` : "Add songs"}
                        </button>
                      </footer>
                    </form>
                  </section>
                </dialog>
              </aside>

              <section className={componentStyles.selectedSongSection} aria-label="Selected song">
                {status && <p className={componentStyles.actionStatusMessage} role="status">{status}</p>}
                {selectedItem ? selectedItem.canOpen && selectedItem.abc ? (
                  <div className={componentStyles.selectedSongLayout}>
                    <div className={componentStyles.selectedSongContent}>
                      <Link
                        className={componentStyles.openSongWorkspaceLink}
                        href={`/${selectedItem.isOwned ? "mylibrary" : "songs"}/${encodeURIComponent(selectedItem.songId)}?setListId=${encodeURIComponent(binder._id)}&setListItemId=${encodeURIComponent(selectedItem._id)}`}
                      >
                        Open song workspace
                      </Link>
                    </div>

                    <PreviewPanel
                      abc={selectedItem.abc}
                      displaySettings={selectedSettings}
                      displayControls={
                        <DisplayControls
                          abc={selectedItem.abc}
                          settings={selectedSettings}
                          onChange={(patch) => void handleDisplayChange(selectedItem._id, selectedSettings, patch)}
                        />
                      }
                      key={selectedItem._id}
                    />
                  </div>
                ) : (
                  <div className={componentStyles.selectedSongEmptyState}>
                    <h2 className={componentStyles.emptyStateTitle}>Song unavailable</h2>
                    <p className={componentStyles.emptyStateDescription}>{selectedItem.title} is no longer available to open.</p>
                  </div>
                ) : (
                  <div className={componentStyles.selectedSongEmptyState}>
                    <h2 className={componentStyles.emptyStateTitle}>This binder is empty</h2>
                    <p className={componentStyles.emptyStateDescription}>Choose one of your songs or a public song in the sidebar to start arranging your performance.</p>
                    <p className={componentStyles.emptyStateBrowseLink}>You can also <Link className={componentStyles.browsePublicSongsLink} href="/songs">browse public songs</Link>.</p>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </main>
      {dragPreview && (
        <div
          aria-hidden="true"
          className={componentStyles.dragPreview}
          style={{ left: dragPreview.left, top: dragPreview.top, width: dragPreview.width }}
        >
          <GripVertical className={componentStyles.dragPreviewIcon} aria-hidden="true" size={16} />
          <span className={componentStyles.dragPreviewSongName}>{dragPreview.title}</span>
          <span className={componentStyles.dragPreviewHint}>Release to place</span>
        </div>
      )}
    </div>
  );
}
