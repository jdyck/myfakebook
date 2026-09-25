"use client";

import { useMemo, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Header } from "@/components/layout/header";
import { DEFAULT_DISPLAY_SETTINGS, type SongDisplaySettings } from "@/lib/abc-display";

const fieldClass = "rounded-lg border border-(--line-strong) bg-(--paper) px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)";
const buttonClass = "rounded-lg border border-(--line) bg-(--paper) px-3 py-2 text-xs font-semibold text-foreground hover:border-(--line-strong) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent) disabled:cursor-not-allowed disabled:opacity-50";
const primaryButtonClass = "rounded-lg bg-(--accent) px-3 py-2 text-xs font-semibold text-white hover:bg-(--accent-deep) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent) disabled:cursor-not-allowed disabled:opacity-50";

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
            <p className="mt-1 text-sm text-(--muted-soft)">Organize private songs in performance order.</p>
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
            <p className="m-0 text-sm text-(--muted-soft)">Create a set list, then add private songs from My Library.</p>
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
  const songs = useQuery(api.songs.listMySongs, isAuthenticated ? {} : "skip");
  const renameSetList = useMutation(api.setLists.rename);
  const removeSetList = useMutation(api.setLists.remove);
  const addSong = useMutation(api.setLists.addSong);
  const updateDisplaySettings = useMutation(api.setLists.updateDisplaySettings);
  const removeItem = useMutation(api.setLists.removeItem);
  const reorder = useMutation(api.setLists.reorder);
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [selectedSongId, setSelectedSongId] = useState("");
  const [settingsByItem, setSettingsByItem] = useState<Record<string, SongDisplaySettings>>({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const privateSongs = useMemo(() => songs?.filter((song) => song.publicationState === "private") ?? [], [songs]);

  const name = nameOverride ?? setList?.name ?? "";
  const loading = isLoading || (isAuthenticated && ((validId !== null && setList === undefined) || songs === undefined));

  async function runChange(action: () => Promise<unknown>, successMessage?: string) {
    setSaving(true);
    setStatus(null);
    try {
      await action();
      if (successMessage) setStatus(successMessage);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Couldn’t update set list");
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
    const song = privateSongs.find((candidate) => candidate._id === selectedSongId);
    if (!song) return;
    await runChange(() => addSong({ setListId: validId, songId: song._id }), `${song.title} added`);
    setSelectedSongId("");
  }

  async function handleDeleteSetList() {
    if (!validId || !window.confirm("Delete this set list? Its songs will stay in My Library.")) return;
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
    <div className="min-h-screen">
      <Header clerkConfigured />
      <main className="mx-auto max-w-3xl px-4 py-8 max-[720px]:py-5">
        <Link className="text-xs font-semibold text-(--accent-deep) hover:underline" href="/setlists">← All set lists</Link>
        {loading ? (
          <p className="mt-6" role="status">Loading set list…</p>
        ) : !setList ? (
          <section className="mt-6 rounded-xl border border-(--line) bg-(--paper) p-5">
            <h1 className="text-xl font-bold">Set list not found</h1>
            <p className="text-sm text-(--muted-soft)">This set list may have been removed, or it may belong to another user.</p>
          </section>
        ) : (
          <>
            <div className="mb-6 mt-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">{setList.name}</h1>
                <p className="mt-1 text-sm text-(--muted-soft)">{setList.items.length} song{setList.items.length === 1 ? "" : "s"} in performance order</p>
                <p className="mt-2 text-xs text-(--muted-soft)">Only private songs can be added. To use a public song, save a copy to My Library first. <Link className="text-(--accent-deep) underline" href="/songs">Browse public songs</Link></p>
              </div>
              <button className={`${buttonClass} inline-flex items-center gap-2 text-(--ui-destructive)`} disabled={saving} onClick={() => void handleDeleteSetList()} type="button">
                <Trash2 aria-hidden="true" size={14} /> Delete set list
              </button>
            </div>

            <form className="mb-4 flex flex-wrap gap-2" onSubmit={(event) => void handleRename(event)}>
              <label className="sr-only" htmlFor="set-list-name">Set list name</label>
              <input className={`${fieldClass} min-w-0 flex-1`} id="set-list-name" maxLength={80} required value={name} onChange={(event) => setNameOverride(event.target.value)} />
              <button className={buttonClass} disabled={saving || name.trim() === setList.name} type="submit">Save name</button>
            </form>

            <form className="mb-5 flex flex-wrap gap-2 rounded-xl border border-(--line) bg-(--paper) p-4" onSubmit={(event) => void handleAddSong(event)}>
              <label className="sr-only" htmlFor="set-list-song">Add a private song</label>
              <select className={`${fieldClass} min-w-0 flex-1`} id="set-list-song" value={selectedSongId} onChange={(event) => setSelectedSongId(event.target.value)}>
                <option value="">Choose a song from My Library</option>
                {privateSongs.map((song) => <option key={song._id} value={song._id}>{song.title}</option>)}
              </select>
              <button className={primaryButtonClass} disabled={saving || !selectedSongId} type="submit">Add song</button>
              {!privateSongs.length && <p className="m-0 w-full text-xs text-(--muted-soft)">Save a public song to My Library first, then you can add the private copy here. <Link className="text-(--accent-deep) underline" href="/songs">Browse songs</Link></p>}
            </form>

            {status && <p className="mb-4 text-sm text-(--muted)" role="status">{status}</p>}

            {setList.items.length ? (
              <ol className="grid gap-3">
                {setList.items.map((item, index) => {
                  const savedSettings = { ...DEFAULT_DISPLAY_SETTINGS, ...item.displaySettings };
                  const settings = settingsByItem[item._id] ?? savedSettings;
                  const songHref = `/mylibrary/${encodeURIComponent(item.songId)}?setListId=${encodeURIComponent(setList._id)}&setListItemId=${encodeURIComponent(item._id)}`;
                  return (
                    <li className="rounded-xl border border-(--line) bg-(--paper) p-4" key={item._id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-(--accent-soft) text-sm font-semibold text-(--accent-deep)">{index + 1}</span>
                          <div className="min-w-0">
                            <Link className="block truncate font-semibold text-foreground hover:text-(--accent-deep)" href={songHref}>{item.title}</Link>
                            <Link className="mt-1 inline-block text-xs text-(--accent-deep) hover:underline" href={songHref}>Open song</Link>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button aria-label={`Move ${item.title} up`} className={buttonClass} disabled={saving || index === 0} onClick={() => void handleMove(index, -1)} type="button"><ArrowUp aria-hidden="true" size={14} /></button>
                          <button aria-label={`Move ${item.title} down`} className={buttonClass} disabled={saving || index === setList.items.length - 1} onClick={() => void handleMove(index, 1)} type="button"><ArrowDown aria-hidden="true" size={14} /></button>
                          <button aria-label={`Remove ${item.title} from set list`} className={`${buttonClass} text-(--ui-destructive)`} disabled={saving} onClick={() => validId && void runChange(() => removeItem({ setListId: validId, itemId: item._id }), `${item.title} removed from set list`)} type="button"><Trash2 aria-hidden="true" size={14} /></button>
                        </div>
                      </div>
                      <fieldset className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-0 p-0" aria-label={`${item.title} display settings`}>
                        <legend className="sr-only">Display settings for {item.title}</legend>
                        <label className="flex items-center gap-2 text-xs text-(--muted)">
                          Transpose
                          <select aria-label={`Transpose ${item.title}`} className={`${fieldClass} px-2 py-1 text-xs`} value={settings.transposition} onChange={(event) => void handleDisplayChange(item._id, savedSettings, { transposition: Number(event.target.value) })}>
                            {Array.from({ length: 25 }, (_, step) => step - 12).map((step) => <option key={step} value={step}>{step > 0 ? `+${step}` : step}</option>)}
                          </select>
                        </label>
                        {([
                          ["showChords", "Show chords"],
                          ["showLyrics", "Show lyrics"],
                        ] as const).map(([key, label]) => (
                          <label className="inline-flex items-center gap-1.5 text-xs text-(--muted)" key={key}>
                            <input aria-label={`${label} for ${item.title}`} checked={settings[key]} className="size-3 accent-(--accent)" type="checkbox" onChange={(event) => void handleDisplayChange(item._id, savedSettings, { [key]: event.target.checked })} />
                            {label.replace("Show ", "")}
                          </label>
                        ))}
                      </fieldset>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="rounded-xl border border-dashed border-(--line-strong) bg-(--paper-soft) px-5 py-8 text-center">
                <p className="mb-2 font-semibold">This set list is empty</p>
                <p className="m-0 text-sm text-(--muted-soft)">Choose a private song above to start arranging your performance.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
