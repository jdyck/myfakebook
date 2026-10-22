"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, GripVertical, Plus, Search, Trash2, X } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Header } from "@/components/app-shell/header/header";
import { PreviewPanel } from "@/components/songs/preview/preview-panel";
import { DisplayControls } from "@/components/songs/workspace/display-controls";
import { DEFAULT_DISPLAY_SETTINGS, type SongDisplaySettings } from "@/lib/abc-display";
import componentStyles from "./set-list-detail.module.css";


function getDropTargetAtPoint(clientX: number, clientY: number) {
  const element = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>("[data-set-list-item]");
  const itemId = element?.dataset.setListItem;
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

type SetListDetailProps = { id: string };

export function SetListDetail({ id }: SetListDetailProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const validId = /^[a-zA-Z0-9_-]+$/.test(id) ? id as Id<"setLists"> : null;
  const setList = useQuery(api.setLists.get, isAuthenticated && validId ? { id: validId } : "skip");
  const availableSongs = useQuery(api.setLists.listAvailableSongs, isAuthenticated ? {} : "skip");
  const renameSetList = useMutation(api.setLists.rename);
  const removeSetList = useMutation(api.setLists.remove);
  const addSong = useMutation(api.setLists.addSong);
  const updateDisplaySettings = useMutation(api.setLists.updateDisplaySettings);
  const removeItem = useMutation(api.setLists.removeItem);
  const reorder = useMutation(api.setLists.reorder);
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const nameDraft = useRef<string | null>(null);
  const savedName = useRef(setList?.name ?? "");
  const nameSaveTimeout = useRef<number | null>(null);
  const nameSaveInFlight = useRef(false);
  const pendingNameSave = useRef<string | null>(null);
  const [isAddSongDialogOpen, setIsAddSongDialogOpen] = useState(false);
  const [songSearch, setSongSearch] = useState("");
  const [selectedSongId, setSelectedSongId] = useState<Id<"songs"> | null>(null);
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
  const highlightedSongId = useRef<Id<"songs"> | null>(null);
  const addSongDialogId = useId();
  const addSongTitleId = useId();
  const addSongDescriptionId = useId();
  const addSongSearchId = useId();
  const savedSetListName = setList?.name ?? "";
  const name = nameOverride ?? setList?.name ?? "";
  const loading = isLoading || (isAuthenticated && ((validId !== null && setList === undefined) || availableSongs === undefined));
  const songsToAdd = availableSongs?.filter((song) => !setList?.items.some((item) => item.songId === song.songId)) ?? [];
  const selectedSong = songsToAdd.find((song) => song.songId === selectedSongId) ?? null;
  const selectedItem = setList?.items.find((item) => item._id === selectedItemId) ?? setList?.items[0];
  const selectedSettings = selectedItem
    ? settingsByItem[selectedItem._id] ?? { ...DEFAULT_DISPLAY_SETTINGS, ...selectedItem.displaySettings }
    : DEFAULT_DISPLAY_SETTINGS;

  useEffect(() => {
    if (savedSetListName) savedName.current = savedSetListName;
  }, [savedSetListName]);

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
      setStatus(error instanceof Error ? error.message : "Couldn’t update set list");
      return undefined;
    } finally {
      setSaving(false);
    }
  }

  async function saveSetListName(value: string) {
    if (!validId || !setList) return;
    const nextName = value.trim();
    if (!nextName) {
      setStatus("Enter a set list name");
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
      () => renameSetList({ id: validId, name: nextName }),
      "Set list name saved",
      "Saving set list name…",
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
    if (pendingName !== null) void saveSetListName(pendingName);
  }

  function handleSetListNameChange(value: string) {
    nameDraft.current = value;
    setNameOverride(value);
    if (nameSaveTimeout.current !== null) window.clearTimeout(nameSaveTimeout.current);
    nameSaveTimeout.current = window.setTimeout(() => {
      nameSaveTimeout.current = null;
      void saveSetListName(value);
    }, 600);
  }

  function handleSetListNameBlur(value: string) {
    if (nameSaveTimeout.current !== null) window.clearTimeout(nameSaveTimeout.current);
    nameSaveTimeout.current = null;
    void saveSetListName(value);
  }

  function openAddSongDialog() {
    setSongSearch("");
    setSelectedSongId(null);
    setAddSongError(null);
    highlightedSongId.current = null;
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
    setSelectedSongId(null);
    setAddSongError(null);
    highlightedSongId.current = null;
  }

  async function addSongToSetList(songId: Id<"songs">) {
    if (!validId) return;
    const song = availableSongs?.find((candidate) => candidate.songId === songId);
    if (!song || setList?.items.some((item) => item.songId === song.songId)) return;
    setAddSongError(null);
    const itemId = await runChange(() => addSong({ setListId: validId, songId: song.songId }), `${song.title} added`);
    if (typeof itemId !== "string") {
      setAddSongError("Couldn’t add that song. Please try again.");
      return;
    }
    setSelectedItemId(itemId);
    closeAddSongDialog();
  }

  async function handleAddSong(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSongId) return;
    await addSongToSetList(selectedSongId);
  }

  function handleAddSongSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing || saving) return;
    const songId = highlightedSongId.current;
    if (!songId) return;
    event.preventDefault();
    event.stopPropagation();
    void addSongToSetList(songId);
  }

  async function handleDeleteSetList() {
    if (!validId || !window.confirm("Delete this set list? Its songs won’t be deleted.")) return;
    await runChange(async () => {
      await removeSetList({ id: validId });
      router.push("/setlists");
    });
  }

  async function handleMove(itemIndex: number, offset: -1 | 1) {
    if (!validId || !setList) return;
    const next = [...setList.items];
    const target = itemIndex + offset;
    if (target < 0 || target >= next.length) return;
    [next[itemIndex], next[target]] = [next[target], next[itemIndex]];
    await runChange(
      () => reorder({ setListId: validId, itemIds: next.map((item) => item._id) }),
      `${next[target].title} moved to position ${target + 1}`,
    );
  }

  async function handleDrop(sourceId: string, targetId: string, position: "before" | "after") {
    setDraggedItemId(null);
    setDropTarget(null);
    if (!validId || !setList || saving || sourceId === targetId) return;

    const next = [...setList.items];
    const sourceIndex = next.findIndex((item) => item._id === sourceId);
    const targetIndex = next.findIndex((item) => item._id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const [movedItem] = next.splice(sourceIndex, 1);
    const adjustedTargetIndex = next.findIndex((item) => item._id === targetId);
    const insertionIndex = adjustedTargetIndex + (position === "after" ? 1 : 0);
    next.splice(insertionIndex, 0, movedItem);
    if (next.every((item, index) => item._id === setList.items[index]._id)) return;

    await runChange(
      () => reorder({ setListId: validId, itemIds: next.map((item) => item._id) }),
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
    itemId: Id<"setListItems">,
    savedSettings: SongDisplaySettings,
    patch: Partial<SongDisplaySettings>,
  ) {
    if (!validId) return;
    const current = settingsByItem[itemId] ?? savedSettings;
    const next = { ...current, ...patch };
    setSettingsByItem((settings) => ({ ...settings, [itemId]: next }));
    await runChange(() => updateDisplaySettings({ setListId: validId, itemId, displaySettings: next }));
  }

  return (
    <div className={componentStyles.pageShell}>
      <Header clerkConfigured />
      <main className={componentStyles.pageContent}>
        {loading ? (
          <p className={componentStyles.loadingStatus} role="status">Loading set list…</p>
        ) : !setList ? (
          <section className={componentStyles.notFoundSection}>
            <Link className={componentStyles.backToSetListsLink} href="/setlists">← All set lists</Link>
            <h1 className={componentStyles.notFoundTitle}>Set list not found</h1>
            <p className={componentStyles.notFoundDescription}>This set list may have been removed, or it may belong to another user.</p>
          </section>
        ) : (
          <div className={componentStyles.setListWorkspace}>
            <aside className={componentStyles.setListSidebar}>
              <Link className={componentStyles.backToSetListsLink} href="/setlists">← All set lists</Link>
              <div className={componentStyles.setListSidebarHeader}>
                <div className={componentStyles.titleAndDetails}>
                  <h1 className={componentStyles.setListTitle}>
                    <input
                      aria-label="Set list name"
                      className={componentStyles.setListTitleInput}
                      maxLength={80}
                      onBlur={(event) => handleSetListNameBlur(event.currentTarget.value)}
                      onChange={(event) => handleSetListNameChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        event.currentTarget.blur();
                      }}
                      value={name}
                    />
                  </h1>
                </div>
              </div>

              <section className={componentStyles.setListSongsSection} aria-labelledby="set-list-songs-heading">
                <div className={componentStyles.songsSectionHeader}>
                  <h2 className={componentStyles.songsSectionTitle} id="set-list-songs-heading">Songs</h2>
                </div>
                {setList.items.length ? (
                  <ol className={componentStyles.orderedSongList} aria-label={`${setList.name} songs`}>
                    {setList.items.map((item, index) => {
                      const isSelected = selectedItem?._id === item._id;
                      const isDragged = draggedItemId === item._id;
                      const isDropTarget = dropTarget?.itemId === item._id;
                      return (
                        <li
                          className={`${componentStyles.orderedSongItem} ${isSelected ? componentStyles.selectedSongItem : componentStyles.unselectedSongItem} ${isDragged ? componentStyles.draggedSongItem : ""} ${isDropTarget ? componentStyles.dropTargetSongItem : ""}`}
                          data-set-list-item={item._id}
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
                                const itemBounds = event.currentTarget.closest<HTMLElement>("[data-set-list-item]")?.getBoundingClientRect();
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
                              <span className={componentStyles.songPositionNumber}>{index + 1}</span>
                              <span className={componentStyles.titleAndDetails}>
                                <span className={componentStyles.songName}>{item.title}</span>
                                {!item.canOpen && <span className={componentStyles.unavailableBadge}>Unavailable</span>}
                              </span>
                            </button>
                            <div className={componentStyles.songItemActions}>
                              <button aria-label={`Remove ${item.title} from set list`} className={`${componentStyles.sharedButton} ${componentStyles.removeSongButton}`} disabled={saving} onClick={() => validId && void runChange(() => removeItem({ setListId: validId, itemId: item._id }), `${item.title} removed from set list`)} type="button"><Trash2 aria-hidden="true" size={14} /></button>
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
                  {draggedItemId && setList.items.find((item) => item._id === draggedItemId)
                    ? dropTarget
                      ? `${setList.items.find((item) => item._id === draggedItemId)?.title} will move ${dropTarget.position} ${setList.items.find((item) => item._id === dropTarget.itemId)?.title}.`
                      : `Moving ${setList.items.find((item) => item._id === draggedItemId)?.title}. Move over another song and release to place it.`
                    : ""}
                </p>
              </section>

              <div className={componentStyles.setListFooterActions}>
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
                <button className={`${componentStyles.sharedButton} ${componentStyles.deleteSetListButton}`} disabled={saving} onClick={() => void handleDeleteSetList()} type="button">
                  <Trash2 aria-hidden="true" size={13} /> Delete
                </button>
              </div>
              <dialog
                aria-describedby={addSongDescriptionId}
                aria-labelledby={addSongTitleId}
                className={componentStyles.addSongDialog}
                id={addSongDialogId}
                onClick={(event) => {
                  if (event.target === event.currentTarget) closeAddSongDialog();
                }}
                onClose={() => {
                  setIsAddSongDialogOpen(false);
                  setSongSearch("");
                  setSelectedSongId(null);
                  setAddSongError(null);
                  highlightedSongId.current = null;
                }}
                ref={addSongDialogRef}
              >
                <section className={componentStyles.addSongDialogContent}>
                  <header className={componentStyles.addSongDialogHeader}>
                    <div>
                      <h2 className={componentStyles.addSongDialogTitle} id={addSongTitleId}>Add a song</h2>
                      <p className={componentStyles.addSongDialogDescription} id={addSongDescriptionId}>Search available songs for {setList.name}.</p>
                    </div>
                    <button
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
                          autoComplete="off"
                          autoHighlight
                          inline
                          inputValue={songSearch}
                          isItemEqualToValue={(item: AvailableSong, value: AvailableSong) => item.songId === value.songId}
                          itemToStringLabel={(song: AvailableSong) => song.title}
                          itemToStringValue={(song: AvailableSong) => String(song.songId)}
                          items={songsToAdd}
                          onInputValueChange={(value, { reason }) => {
                            setSongSearch(value);
                            if (reason !== "item-press") setSelectedSongId(null);
                            setAddSongError(null);
                            highlightedSongId.current = null;
                          }}
                          onItemHighlighted={(song, { reason }) => {
                            highlightedSongId.current = reason === "keyboard" ? song?.songId ?? null : null;
                          }}
                          onValueChange={(song: AvailableSong | null) => {
                            setSelectedSongId(song?.songId ?? null);
                            setAddSongError(null);
                          }}
                          open={isAddSongDialogOpen}
                          value={selectedSong}
                        >
                          <label className={componentStyles.addSongSearchLabel} htmlFor={addSongSearchId}>Search songs</label>
                          <div className={componentStyles.addSongSearchBox}>
                            <Search aria-hidden="true" className={componentStyles.addSongSearchIcon} size={15} />
                            <Combobox.Input
                              id={addSongSearchId}
                              placeholder="Type a song title…"
                              ref={addSongSearchRef}
                              onKeyDownCapture={handleAddSongSearchKeyDown}
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
                            "All available songs are already in this set list."
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
                      <button className={componentStyles.sharedButton} onClick={closeAddSongDialog} type="button">Cancel</button>
                      <button className={componentStyles.sharedPrimaryButton} disabled={saving || !selectedSong} type="submit">
                        {saving ? "Adding…" : "Add song"}
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
                      href={`/${selectedItem.isOwned ? "mylibrary" : "songs"}/${encodeURIComponent(selectedItem.songId)}?setListId=${encodeURIComponent(setList._id)}&setListItemId=${encodeURIComponent(selectedItem._id)}`}
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
                  <h2 className={componentStyles.emptyStateTitle}>This set list is empty</h2>
                  <p className={componentStyles.emptyStateDescription}>Choose one of your songs or a public song in the sidebar to start arranging your performance.</p>
                  <p className={componentStyles.emptyStateBrowseLink}>You can also <Link className={componentStyles.browsePublicSongsLink} href="/songs">browse public songs</Link>.</p>
                </div>
              )}
            </section>
          </div>
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
