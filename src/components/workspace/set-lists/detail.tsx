"use client";

import { useRef, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from "lucide-react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Header } from "@/components/layout/header";
import { AbcPreview } from "@/components/workspace/abc-preview";
import { DEFAULT_DISPLAY_SETTINGS, type SongDisplaySettings } from "@/lib/abc-display";
import componentStyles from "./detail.module.css";


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
  const [selectedSongId, setSelectedSongId] = useState("");
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
  const name = nameOverride ?? setList?.name ?? "";
  const loading = isLoading || (isAuthenticated && ((validId !== null && setList === undefined) || availableSongs === undefined));
  const selectedItem = setList?.items.find((item) => item._id === selectedItemId) ?? setList?.items[0];
  const selectedItemIndex = selectedItem ? setList?.items.findIndex((item) => item._id === selectedItem._id) ?? -1 : -1;
  const selectedSettings = selectedItem
    ? settingsByItem[selectedItem._id] ?? { ...DEFAULT_DISPLAY_SETTINGS, ...selectedItem.displaySettings }
    : DEFAULT_DISPLAY_SETTINGS;

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

  async function handleRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validId) return;
    await runChange(() => renameSetList({ id: validId, name }), "Set list name saved");
  }

  async function handleAddSong(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validId) return;
    const song = availableSongs?.find((candidate) => candidate.songId === selectedSongId);
    if (!song || setList?.items.some((item) => item.songId === song.songId)) return;
    const itemId = await runChange(() => addSong({ setListId: validId, songId: song.songId }), `${song.title} added`);
    if (typeof itemId === "string") setSelectedItemId(itemId);
    setSelectedSongId("");
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
    await runChange(() => reorder({ setListId: validId, itemIds: next.map((item) => item._id) }));
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
                  <h1 className={componentStyles.setListTitle}>{setList.name}</h1>
                  <p className={componentStyles.setListSongCount}>{setList.items.length} song{setList.items.length === 1 ? "" : "s"} in performance order</p>
                </div>
                <button className={`${componentStyles.sharedButton} ${componentStyles.deleteSetListButton}`} disabled={saving} onClick={() => void handleDeleteSetList()} type="button">
                  <Trash2 aria-hidden="true" size={13} /> Delete
                </button>
              </div>

              <form className={componentStyles.renameSetListForm} onSubmit={(event) => void handleRename(event)}>
                <label className={componentStyles.formFieldLabel} htmlFor="set-list-name">Set list name</label>
                <input className={`${componentStyles.sharedField} ${componentStyles.formField}`} id="set-list-name" maxLength={80} required value={name} onChange={(event) => setNameOverride(event.target.value)} />
                <button className={`${componentStyles.sharedButton} ${componentStyles.saveSetListNameButton}`} disabled={saving || name.trim() === setList.name} type="submit">Save name</button>
              </form>

              <form className={componentStyles.addSongForm} onSubmit={(event) => void handleAddSong(event)}>
                <label className={componentStyles.formFieldLabel} htmlFor="set-list-song">Add a song</label>
                <select className={`${componentStyles.sharedField} ${componentStyles.formField}`} id="set-list-song" value={selectedSongId} onChange={(event) => setSelectedSongId(event.target.value)}>
                  <option value="">Choose a song…</option>
                  {availableSongs?.map((song) => {
                    const selectionKey = song.songId;
                    const alreadyAdded = setList.items.some((item) => item.songId === song.songId);
                    const label = `${song.title}${song.isPublic ? " · Public" : ""}`;
                    return <option disabled={alreadyAdded} key={selectionKey} value={selectionKey}>{alreadyAdded ? `${label} (already added)` : label}</option>;
                  })}
                </select>
                <button className={componentStyles.sharedPrimaryButton} disabled={saving || !selectedSongId || !availableSongs?.some((song) => song.songId === selectedSongId && !setList.items.some((item) => item.songId === song.songId))} type="submit">Add song</button>
                {availableSongs?.length === 0 && <p className={componentStyles.noAvailableSongsMessage}>There are no songs to add yet. Create one or <Link className={componentStyles.browsePublicSongsLink} href="/songs">browse public songs</Link>.</p>}
              </form>

              <section className={componentStyles.setListSongsSection} aria-labelledby="set-list-songs-heading">
                <div className={componentStyles.songsSectionHeader}>
                  <h2 className={componentStyles.songsSectionTitle} id="set-list-songs-heading">Songs</h2>
                  <span className={componentStyles.reorderHint}>Drag grip to reorder</span>
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
                              aria-label={`Drag ${item.title} to reorder; use the move up and move down buttons for keyboard reordering`}
                              className={componentStyles.dragHandleButton}
                              disabled={saving}
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
                              <button aria-label={`Move ${item.title} up`} className={`${componentStyles.sharedButton} ${componentStyles.moveSongButton}`} disabled={saving || index === 0} onClick={() => void handleMove(index, -1)} type="button"><ArrowUp aria-hidden="true" size={14} /></button>
                              <button aria-label={`Move ${item.title} down`} className={`${componentStyles.sharedButton} ${componentStyles.moveSongButton}`} disabled={saving || index === setList.items.length - 1} onClick={() => void handleMove(index, 1)} type="button"><ArrowDown aria-hidden="true" size={14} /></button>
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
            </aside>

            <section className={componentStyles.selectedSongSection} aria-label="Selected song">
              {status && <p className={componentStyles.actionStatusMessage} role="status">{status}</p>}
              {selectedItem ? selectedItem.canOpen && selectedItem.abc ? (
                <div className={componentStyles.selectedSongLayout}>
                  <div className={componentStyles.selectedSongContent}>
                    <div className={componentStyles.titleAndDetails}>
                      <p className={componentStyles.selectedSongPosition}>Song {selectedItemIndex + 1} of {setList.items.length} · {setList.name}</p>
                      <h2 className={componentStyles.selectedSongTitle}>{selectedItem.title}</h2>
                    </div>
                    <Link
                      className={componentStyles.openSongWorkspaceLink}
                      href={`/${selectedItem.isOwned ? "mylibrary" : "songs"}/${encodeURIComponent(selectedItem.songId)}?setListId=${encodeURIComponent(setList._id)}&setListItemId=${encodeURIComponent(selectedItem._id)}`}
                    >
                      Open song workspace
                    </Link>
                  </div>

                  <fieldset className={componentStyles.selectedSongDisplaySettings} aria-label={`${selectedItem.title} display settings`}>
                    <legend className={componentStyles.visuallyHidden}>Display settings for {selectedItem.title}</legend>
                    <label className={componentStyles.transposeFieldLabel}>
                      Transpose
                      <select aria-label={`Transpose ${selectedItem.title}`} className={`${componentStyles.sharedField} ${componentStyles.transposeSelect}`} value={selectedSettings.transposition} onChange={(event) => void handleDisplayChange(selectedItem._id, { ...DEFAULT_DISPLAY_SETTINGS, ...selectedItem.displaySettings }, { transposition: Number(event.target.value) })}>
                        {Array.from({ length: 25 }, (_, step) => step - 12).map((step) => <option key={step} value={step}>{step > 0 ? `+${step}` : step}</option>)}
                      </select>
                    </label>
                    {([
                      ["showChords", "Show chords"],
                      ["showLyrics", "Show lyrics"],
                    ] as const).map(([key, label]) => (
                      <label className={componentStyles.displayToggleLabel} key={key}>
                        <input aria-label={`${label} for ${selectedItem.title}`} checked={selectedSettings[key]} className={componentStyles.displayToggleCheckbox} type="checkbox" onChange={(event) => void handleDisplayChange(selectedItem._id, { ...DEFAULT_DISPLAY_SETTINGS, ...selectedItem.displaySettings }, { [key]: event.target.checked })} />
                        {label.replace("Show ", "")}
                      </label>
                    ))}
                  </fieldset>

                  <div className={componentStyles.selectedSongPreview}>
                    <AbcPreview
                      abc={selectedItem.abc}
                      key={selectedItem._id}
                      showChords={selectedSettings.showChords}
                      showLyrics={selectedSettings.showLyrics}
                      transposition={selectedSettings.transposition}
                    />
                  </div>
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
