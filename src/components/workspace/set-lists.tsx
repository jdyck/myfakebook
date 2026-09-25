"use client";

import { useRef, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Header } from "@/components/layout/header";
import { AbcPreview } from "@/components/workspace/abc-preview";
import { DEFAULT_DISPLAY_SETTINGS, type SongDisplaySettings } from "@/lib/abc-display";

const fieldClass = "rounded-lg border border-(--line-strong) bg-(--paper) px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)";
const buttonClass = "rounded-lg border border-(--line) bg-(--paper) px-3 py-2 text-xs font-semibold text-foreground hover:border-(--line-strong) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent) disabled:cursor-not-allowed disabled:opacity-50";
const primaryButtonClass = "rounded-lg bg-(--accent) px-3 py-2 text-xs font-semibold text-white hover:bg-(--accent-deep) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent) disabled:cursor-not-allowed disabled:opacity-50";

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

export function SetListsIndex() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const setLists = useQuery(api.setLists.listMine, isAuthenticated ? {} : "skip");
  const createSetList = useMutation(api.setLists.create);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const id = await createSetList({ name });
      router.push(`/setlists/${encodeURIComponent(id)}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Couldn’t create set list");
    } finally {
      setSaving(false);
    }
  }

  const loading = isLoading || (isAuthenticated && setLists === undefined);

  return (
    <div className="min-h-screen">
      <Header clerkConfigured />
      <main className="mx-auto max-w-3xl px-4 py-8 max-[720px]:py-5">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Set lists</h1>
            <p className="mt-1 text-sm text-(--muted-soft)">Organize songs in performance order.</p>
          </div>
          {!loading && setLists && <span className="shrink-0 pt-2 text-xs text-(--muted-soft)">{setLists.length} set list{setLists.length === 1 ? "" : "s"}</span>}
        </div>

        <form className="mb-6 flex flex-wrap gap-2 rounded-xl border border-(--line) bg-(--paper) p-4" onSubmit={(event) => void handleCreate(event)}>
          <label className="sr-only" htmlFor="new-set-list-name">Set list name</label>
          <input
            className={`${fieldClass} min-w-0 flex-1`}
            id="new-set-list-name"
            maxLength={80}
            placeholder="For example, Friday at the Blue Note"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button className={primaryButtonClass} disabled={saving} type="submit">{saving ? "Creating…" : "Create set list"}</button>
        </form>
        {status && <p className="mb-4 text-sm text-(--ui-destructive)" role="alert">{status}</p>}

        {loading ? (
          <p role="status">Loading your set lists…</p>
        ) : setLists?.length ? (
          <ul className="grid gap-2">
            {setLists.map((setList) => (
              <li key={setList._id}>
                <Link
                  className="flex items-center justify-between gap-4 rounded-lg border border-(--line) bg-(--paper) px-4 py-3 hover:border-(--line-strong) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)"
                  href={`/setlists/${encodeURIComponent(setList._id)}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-foreground">{setList.name}</span>
                    <span className="mt-0.5 block text-xs text-(--muted-soft)">{setList.itemCount} song{setList.itemCount === 1 ? "" : "s"} · Updated {new Date(setList.updatedAt).toLocaleDateString()}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-(--accent-deep)">Open</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-(--line-strong) bg-(--paper-soft) px-5 py-8 text-center">
            <p className="mb-2 font-semibold">No set lists yet</p>
            <p className="m-0 text-sm text-(--muted-soft)">Create a set list, then add your songs or songs from the public library.</p>
          </div>
        )}
      </main>
    </div>
  );
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
    <div className="min-h-screen bg-(--canvas)">
      <Header clerkConfigured />
      <main className="min-h-[calc(100vh-58px)]">
        {loading ? (
          <p className="px-6 py-8" role="status">Loading set list…</p>
        ) : !setList ? (
          <section className="mx-auto mt-8 max-w-3xl rounded-xl border border-(--line) bg-(--paper) p-5">
            <Link className="text-xs font-semibold text-(--accent-deep) hover:underline" href="/setlists">← All set lists</Link>
            <h1 className="text-xl font-bold">Set list not found</h1>
            <p className="text-sm text-(--muted-soft)">This set list may have been removed, or it may belong to another user.</p>
          </section>
        ) : (
          <div className="mx-auto grid min-h-[calc(100vh-58px)] max-w-[1600px] grid-cols-[300px_minmax(0,1fr)] border-x border-(--line) bg-(--paper) max-[800px]:grid-cols-1">
            <aside className="min-w-0 border-r border-(--line) bg-(--paper-soft) px-4 py-5 max-[800px]:border-r-0 max-[800px]:border-b max-[800px]:py-4">
              <Link className="text-xs font-semibold text-(--accent-deep) hover:underline" href="/setlists">← All set lists</Link>
              <div className="mt-4 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h1 className="break-words text-lg font-bold leading-tight">{setList.name}</h1>
                  <p className="mt-1 text-xs text-(--muted-soft)">{setList.items.length} song{setList.items.length === 1 ? "" : "s"} in performance order</p>
                </div>
                <button className={`${buttonClass} inline-flex shrink-0 items-center gap-1.5 text-(--ui-destructive)`} disabled={saving} onClick={() => void handleDeleteSetList()} type="button">
                  <Trash2 aria-hidden="true" size={13} /> Delete
                </button>
              </div>

              <form className="mt-4 grid gap-2" onSubmit={(event) => void handleRename(event)}>
                <label className="text-[10px] font-semibold text-(--muted)" htmlFor="set-list-name">Set list name</label>
                <input className={`${fieldClass} w-full`} id="set-list-name" maxLength={80} required value={name} onChange={(event) => setNameOverride(event.target.value)} />
                <button className={`${buttonClass} justify-self-start`} disabled={saving || name.trim() === setList.name} type="submit">Save name</button>
              </form>

              <form className="mt-5 grid gap-2 border-t border-(--line) pt-4" onSubmit={(event) => void handleAddSong(event)}>
                <label className="text-[10px] font-semibold text-(--muted)" htmlFor="set-list-song">Add a song</label>
                <select className={`${fieldClass} w-full`} id="set-list-song" value={selectedSongId} onChange={(event) => setSelectedSongId(event.target.value)}>
                  <option value="">Choose a song…</option>
                  {availableSongs?.map((song) => {
                    const selectionKey = song.songId;
                    const alreadyAdded = setList.items.some((item) => item.songId === song.songId);
                    const label = `${song.title}${song.isPublic ? " · Public" : ""}`;
                    return <option disabled={alreadyAdded} key={selectionKey} value={selectionKey}>{alreadyAdded ? `${label} (already added)` : label}</option>;
                  })}
                </select>
                <button className={primaryButtonClass} disabled={saving || !selectedSongId || !availableSongs?.some((song) => song.songId === selectedSongId && !setList.items.some((item) => item.songId === song.songId))} type="submit">Add song</button>
                {availableSongs?.length === 0 && <p className="m-0 text-[10px] leading-relaxed text-(--muted-soft)">There are no songs to add yet. Create one or <Link className="text-(--accent-deep) underline" href="/songs">browse public songs</Link>.</p>}
              </form>

              <section className="mt-5 border-t border-(--line) pt-4" aria-labelledby="set-list-songs-heading">
                <div className="flex items-center justify-between gap-2 px-1">
                  <h2 className="text-[10px] font-bold uppercase tracking-[0.08em] text-(--muted-soft)" id="set-list-songs-heading">Songs</h2>
                  <span className="text-[9px] text-(--muted-soft)">Drag grip to reorder</span>
                </div>
                {setList.items.length ? (
                  <ol className="mt-2 grid gap-1.5" aria-label={`${setList.name} songs`}>
                    {setList.items.map((item, index) => {
                      const isSelected = selectedItem?._id === item._id;
                      const isDragged = draggedItemId === item._id;
                      const isDropTarget = dropTarget?.itemId === item._id;
                      return (
                        <li
                          className={`relative rounded-lg border bg-(--paper) p-1 transition-colors ${isSelected ? "border-(--accent) bg-(--accent-soft)" : "border-(--line)"} ${isDragged ? "border-dashed border-(--accent) bg-(--accent-soft) opacity-45" : ""} ${isDropTarget ? "bg-(--accent-soft)" : ""}`}
                          data-set-list-item={item._id}
                          key={item._id}
                        >
                          {isDropTarget && (
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none absolute left-2 right-2 z-20 h-[3px] rounded-full bg-(--accent) shadow-[0_0_0_2px_var(--paper)] ${dropTarget.position === "before" ? "-top-[5px]" : "-bottom-[5px]"}`}
                            />
                          )}
                          <div className="flex items-center gap-1">
                            <button
                              aria-label={`Drag ${item.title} to reorder; use the move up and move down buttons for keyboard reordering`}
                              className="grid size-9 shrink-0 cursor-grab touch-none select-none place-items-center rounded-lg border border-(--accent)/30 bg-(--accent-soft) p-0 text-(--accent-deep) hover:border-(--accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent) active:cursor-grabbing"
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
                              className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--accent) disabled:cursor-not-allowed disabled:opacity-55"
                              disabled={!item.canOpen || saving}
                              onClick={() => setSelectedItemId(item._id)}
                              type="button"
                            >
                              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-(--paper-soft) text-[10px] font-semibold text-(--accent-deep)">{index + 1}</span>
                              <span className="min-w-0">
                                <span className="block truncate text-xs font-semibold text-foreground">{item.title}</span>
                                {!item.canOpen && <span className="mt-0.5 block text-[9px] text-(--muted-soft)">Unavailable</span>}
                              </span>
                            </button>
                            <div className="flex shrink-0 items-center">
                              <button aria-label={`Move ${item.title} up`} className={`${buttonClass} grid size-8 place-items-center p-0`} disabled={saving || index === 0} onClick={() => void handleMove(index, -1)} type="button"><ArrowUp aria-hidden="true" size={14} /></button>
                              <button aria-label={`Move ${item.title} down`} className={`${buttonClass} grid size-8 place-items-center p-0`} disabled={saving || index === setList.items.length - 1} onClick={() => void handleMove(index, 1)} type="button"><ArrowDown aria-hidden="true" size={14} /></button>
                              <button aria-label={`Remove ${item.title} from set list`} className={`${buttonClass} grid size-8 place-items-center p-0 text-(--ui-destructive)`} disabled={saving} onClick={() => validId && void runChange(() => removeItem({ setListId: validId, itemId: item._id }), `${item.title} removed from set list`)} type="button"><Trash2 aria-hidden="true" size={14} /></button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="px-1 py-3 text-xs text-(--muted-soft)">Add a song to start your set.</p>
                )}
                <p className="sr-only" aria-live="polite" aria-atomic="true">
                  {draggedItemId && setList.items.find((item) => item._id === draggedItemId)
                    ? dropTarget
                      ? `${setList.items.find((item) => item._id === draggedItemId)?.title} will move ${dropTarget.position} ${setList.items.find((item) => item._id === dropTarget.itemId)?.title}.`
                      : `Moving ${setList.items.find((item) => item._id === draggedItemId)?.title}. Move over another song and release to place it.`
                    : ""}
                </p>
              </section>
            </aside>

            <section className="min-w-0 px-6 py-6 max-[720px]:px-3.5 max-[720px]:py-4" aria-label="Selected song">
              {status && <p className="mb-3 text-xs text-(--muted)" role="status">{status}</p>}
              {selectedItem ? selectedItem.canOpen && selectedItem.abc ? (
                <div className="mx-auto flex min-h-[calc(100vh-106px)] max-w-5xl flex-col">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-(--muted-soft)">Song {selectedItemIndex + 1} of {setList.items.length} · {setList.name}</p>
                      <h2 className="text-2xl font-bold">{selectedItem.title}</h2>
                    </div>
                    <Link
                      className="shrink-0 text-xs font-semibold text-(--accent-deep) hover:underline"
                      href={`/${selectedItem.isOwned ? "mylibrary" : "songs"}/${encodeURIComponent(selectedItem.songId)}?setListId=${encodeURIComponent(setList._id)}&setListItemId=${encodeURIComponent(selectedItem._id)}`}
                    >
                      Open song workspace
                    </Link>
                  </div>

                  <fieldset className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-(--line) bg-(--paper) px-4 py-3" aria-label={`${selectedItem.title} display settings`}>
                    <legend className="sr-only">Display settings for {selectedItem.title}</legend>
                    <label className="flex items-center gap-2 text-xs text-(--muted)">
                      Transpose
                      <select aria-label={`Transpose ${selectedItem.title}`} className={`${fieldClass} px-2 py-1 text-xs`} value={selectedSettings.transposition} onChange={(event) => void handleDisplayChange(selectedItem._id, { ...DEFAULT_DISPLAY_SETTINGS, ...selectedItem.displaySettings }, { transposition: Number(event.target.value) })}>
                        {Array.from({ length: 25 }, (_, step) => step - 12).map((step) => <option key={step} value={step}>{step > 0 ? `+${step}` : step}</option>)}
                      </select>
                    </label>
                    {([
                      ["showChords", "Show chords"],
                      ["showLyrics", "Show lyrics"],
                    ] as const).map(([key, label]) => (
                      <label className="inline-flex items-center gap-1.5 text-xs text-(--muted)" key={key}>
                        <input aria-label={`${label} for ${selectedItem.title}`} checked={selectedSettings[key]} className="size-3 accent-(--accent)" type="checkbox" onChange={(event) => void handleDisplayChange(selectedItem._id, { ...DEFAULT_DISPLAY_SETTINGS, ...selectedItem.displaySettings }, { [key]: event.target.checked })} />
                        {label.replace("Show ", "")}
                      </label>
                    ))}
                  </fieldset>

                  <div className="flex min-h-[620px] flex-1 flex-col rounded-xl border border-(--line) bg-(--paper) p-4 max-[720px]:min-h-[500px] max-[720px]:p-3">
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
                <div className="mx-auto mt-12 max-w-xl rounded-xl border border-dashed border-(--line-strong) bg-(--paper-soft) px-5 py-8 text-center">
                  <h2 className="text-lg font-bold">Song unavailable</h2>
                  <p className="mt-2 text-sm text-(--muted-soft)">{selectedItem.title} is no longer available to open.</p>
                </div>
              ) : (
                <div className="mx-auto mt-12 max-w-xl rounded-xl border border-dashed border-(--line-strong) bg-(--paper-soft) px-5 py-8 text-center">
                  <h2 className="text-lg font-bold">This set list is empty</h2>
                  <p className="mt-2 text-sm text-(--muted-soft)">Choose one of your songs or a public song in the sidebar to start arranging your performance.</p>
                  <p className="mt-3 text-xs text-(--muted-soft)">You can also <Link className="text-(--accent-deep) underline" href="/songs">browse public songs</Link>.</p>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
      {dragPreview && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[100] flex h-10 items-center gap-2 overflow-hidden rounded-lg border-2 border-(--accent) bg-(--paper) px-2.5 text-xs font-semibold text-foreground shadow-xl"
          style={{ left: dragPreview.left, top: dragPreview.top, width: dragPreview.width }}
        >
          <GripVertical className="shrink-0 text-(--accent-deep)" aria-hidden="true" size={16} />
          <span className="min-w-0 flex-1 truncate">{dragPreview.title}</span>
          <span className="shrink-0 text-[9px] font-medium text-(--muted-soft)">Release to place</span>
        </div>
      )}
    </div>
  );
}
