"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ChangeEvent } from "react";
import Link from "next/link";
import { AbcEditorPanel } from "@/components/workspace/abc-editor-panel";
import {
  AdminPublicationButton,
  AdminUnpublishPublicSongButton,
  RemoveSongButton,
  SaveToSetListButton,
  SaveSetListDisplaySettingsButton,
  SaveToMyLibraryButton,
  type LoadedSong,
  type SetListSong,
} from "@/components/workspace/song-persistence";
import { Header } from "@/components/layout/header";
import { PreviewPanel } from "@/components/workspace/preview-panel";
import { PrivateLibrarySidebar } from "@/components/workspace/private-library-sidebar";
import { WorkspaceToolbar } from "@/components/workspace/workspace-toolbar";
import type { Id } from "../../../convex/_generated/dataModel";
import { abcToMusicXml, DEFAULT_ABC } from "@/lib/abc";
import { DEFAULT_DISPLAY_SETTINGS, type SongDisplaySettings } from "@/lib/abc-display";
import type { PublicSong } from "@/lib/public-library";

const RECENT_PRIVATE_SONGS_STORAGE_KEY = "myfakebook:recent-private-song-ids";
const MAX_RECENT_PRIVATE_SONGS = 50;
const recentPrivateSongListeners = new Set<() => void>();
let recentPrivateSongSnapshot: string | null = null;

function getRecentPrivateSongSnapshot() {
  try {
    recentPrivateSongSnapshot = window.localStorage.getItem(RECENT_PRIVATE_SONGS_STORAGE_KEY) ?? "[]";
  } catch {
    recentPrivateSongSnapshot ??= "[]";
  }
  return recentPrivateSongSnapshot;
}

function subscribeToRecentPrivateSongs(listener: () => void) {
  recentPrivateSongListeners.add(listener);
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== RECENT_PRIVATE_SONGS_STORAGE_KEY) return;
    recentPrivateSongSnapshot = event.newValue ?? "[]";
    listener();
  };
  window.addEventListener("storage", handleStorage);

  return () => {
    recentPrivateSongListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function parseRecentPrivateSongIds(snapshot: string) {
  try {
    const savedIds: unknown = JSON.parse(snapshot);
    return Array.isArray(savedIds)
      ? savedIds.filter((songId): songId is string => typeof songId === "string").slice(-MAX_RECENT_PRIVATE_SONGS)
      : [];
  } catch {
    return [];
  }
}

function mergeRecentPrivateSongIds(...histories: (readonly string[])[]) {
  return histories
    .flat()
    .reverse()
    .filter((songId, index, allSongIds) => allSongIds.indexOf(songId) === index)
    .reverse()
    .slice(-MAX_RECENT_PRIVATE_SONGS);
}

function writeRecentPrivateSongIds(songIds: readonly string[]) {
  const nextSnapshot = JSON.stringify(songIds.slice(-MAX_RECENT_PRIVATE_SONGS));
  recentPrivateSongSnapshot = nextSnapshot;
  try {
    window.localStorage.setItem(RECENT_PRIVATE_SONGS_STORAGE_KEY, nextSnapshot);
  } catch {
    // Recent song navigation should still work when browser storage is unavailable.
  }
  recentPrivateSongListeners.forEach((listener) => listener());
}

function recordRecentPrivateSong(songId: string) {
  const history = parseRecentPrivateSongIds(getRecentPrivateSongSnapshot());
  writeRecentPrivateSongIds(mergeRecentPrivateSongIds(history.filter((id) => id !== songId), [songId]));
}

function forgetRecentPrivateSong(songId: string) {
  const history = parseRecentPrivateSongIds(getRecentPrivateSongSnapshot());
  writeRecentPrivateSongIds(history.filter((id) => id !== songId));
}

type MyFakebookWorkspaceProps = {
  clerkConfigured: boolean;
  persistenceEnabled: boolean;
  publicSongs: readonly PublicSong[];
  publicLibraryIsPersisted?: boolean;
  initialPublicSongId?: string;
  initialPrivateSong?: LoadedSong;
  initialDisplaySettings?: SongDisplaySettings;
  setListReturn?: {
    href: string;
    name: string;
    setListId: Id<"setLists">;
    itemId: Id<"setListItems">;
    songId: Id<"songs">;
  };
};

function findReplacementPrivateSong(
  songs: readonly LoadedSong[],
  privateSongHistory: readonly string[],
  excludedId: string,
) {
  for (const songId of [...privateSongHistory].reverse()) {
    const song = songs.find((candidate) => candidate.id === songId);
    if (song && song.id !== excludedId) return song;
  }

  return songs.find((song) => song.id !== excludedId) ?? null;
}

export function MyFakebookWorkspace({
  clerkConfigured,
  persistenceEnabled,
  publicSongs,
  publicLibraryIsPersisted = false,
  initialPublicSongId,
  initialPrivateSong,
  initialDisplaySettings,
  setListReturn,
}: MyFakebookWorkspaceProps) {
  const initialPublicSong = publicSongs.find((song) => song.id === initialPublicSongId) ?? publicSongs[0];
  const initialPrivateSongId = initialPrivateSong?.id;
  const [abc, setAbc] = useState(initialPrivateSong?.abc ?? initialPublicSong?.abc ?? DEFAULT_ABC);
  const [title, setTitle] = useState(initialPrivateSong?.title ?? initialPublicSong?.title ?? "Midnight Walk");
  const [sourceLabel, setSourceLabel] = useState(initialPrivateSong ? (initialPrivateSong.publicationState === "published" ? "Published song" : "Private song") : initialPublicSong ? "Public song" : "New song");
  const [isPublicSong, setIsPublicSong] = useState(!initialPrivateSong && Boolean(initialPublicSong));
  const [selectedPublicSongId, setSelectedPublicSongId] = useState<string | null>(initialPrivateSong ? null : initialPublicSong?.id ?? null);
  const [sourcePublicSongId, setSourcePublicSongId] = useState<string | null>(initialPrivateSong ? null : initialPublicSong?.id ?? null);
  const [saveStatus, setSaveStatus] = useState(persistenceEnabled ? "Connecting…" : "Not saved");
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [displaySettings, setDisplaySettings] = useState<SongDisplaySettings>(initialDisplaySettings ?? DEFAULT_DISPLAY_SETTINGS);
  const [currentSong, setCurrentSong] = useState<LoadedSong | null>(initialPrivateSong ?? null);
  const [privateSongs, setPrivateSongs] = useState<LoadedSong[]>(initialPrivateSong ? [initialPrivateSong] : []);
  const recentPrivateSongSnapshotValue = useSyncExternalStore(
    subscribeToRecentPrivateSongs,
    getRecentPrivateSongSnapshot,
    () => "[]",
  );
  const privateSongHistory = useMemo(
    () => mergeRecentPrivateSongIds(
      parseRecentPrivateSongIds(recentPrivateSongSnapshotValue),
      initialPrivateSongId ? [initialPrivateSongId] : [],
    ),
    [initialPrivateSongId, recentPrivateSongSnapshotValue],
  );

  const handleCurrentSongChange = useCallback(
    (song: LoadedSong | null) => {
      setCurrentSong(song);
      if (song && !isPublicSong) setSourceLabel(song.publicationState === "published" ? "Published song" : "Private song");
    },
    [isPublicSong],
  );

  const conversion = useMemo(() => {
    try {
      return abcToMusicXml(abc);
    } catch {
      return null;
    }
  }, [abc]);

  const lineCount = abc.split("\n").length;
  const sourceLength = abc.length;
  const songTitle = title.trim() || "Untitled lead sheet";
  const selectedPublicSong = selectedPublicSongId
    ? publicSongs.find((song) => song.id === selectedPublicSongId)
    : undefined;
  const setListSong: SetListSong | null = isPublicSong
    ? publicLibraryIsPersisted && selectedPublicSong
      ? { id: selectedPublicSong.id as Id<"songs">, title: songTitle }
      : null
    : currentSong
      ? { id: currentSong.id, title: currentSong.title }
      : null;
  function updateDisplaySettings(patch: Partial<SongDisplaySettings>) {
    setDisplaySettings((current) => ({ ...current, ...patch }));
  }

  useEffect(() => {
    try {
      window.localStorage.removeItem("myfakebook:draft");
      window.localStorage.removeItem("notate:draft");
    } catch {
      // Editing should still work when browser storage is unavailable.
    }
  }, []);

  useEffect(() => {
    if (initialPrivateSongId) recordRecentPrivateSong(initialPrivateSongId);
  }, [initialPrivateSongId]);

  const handleStatus = useCallback((status: string) => setSaveStatus(status), []);

  function updateTitle(value: string) {
    setSourceLabel(isPublicSong ? "Public song edit" : "New song");
    setSelectedPublicSongId(null);
    setTitle(value);
    setAbc((current) => {
      if (/^T:.*$/m.test(current)) return current.replace(/^T:.*$/m, `T:${value}`);
      return `T:${value}\n${current}`;
    });
  }

  function handleNewSong() {
    setTitle("Midnight Walk");
    setAbc(DEFAULT_ABC);
    setSourceLabel("New song");
    setIsPublicSong(false);
    setSelectedPublicSongId(null);
    setSourcePublicSongId(null);
    setCurrentSong(null);
    setFeedback("Fresh lead sheet ready");
  }

  function handleOpenPrivateSong(song: LoadedSong, feedbackMessage = `Loaded ${song.title}`) {
    setCurrentSong(song);
    setTitle(song.title);
    setAbc(song.abc);
    setSourceLabel(song.publicationState === "published" ? "Published song" : "Private song");
    setIsPublicSong(false);
    setSelectedPublicSongId(null);
    setSourcePublicSongId(null);
    recordRecentPrivateSong(song.id);
    setFeedback(feedbackMessage);
  }

  function handleFormat() {
    setSourceLabel(isPublicSong ? "Public song edit" : "New song");
    setSelectedPublicSongId(null);
    setAbc((current) =>
      current
        .replaceAll("\r\n", "\n")
        .split("\n")
        .map((line) => line.trimEnd())
        .join("\n")
        .replace(/\n{3,}/g, "\n\n"),
    );
    setFeedback("ABC spacing cleaned up");
  }

  function handleAbcChange(value: string) {
    setSourceLabel(isPublicSong ? "Public song edit" : "New song");
    setSelectedPublicSongId(null);
    setAbc(value);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(abc);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setFeedback("Clipboard access is unavailable");
    }
  }

  function handleFileImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const nextAbc = typeof reader.result === "string" ? reader.result : "";
      handleAbcChange(nextAbc);
      const importedTitle = nextAbc.match(/^T:\s*(.*)$/m)?.[1]?.trim();
      if (importedTitle) setTitle(importedTitle);
      setFeedback(`Imported ${file.name}`);
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  async function handleExport() {
    if (!conversion) {
      setFeedback("Fix the ABC source before exporting");
      return;
    }
    setExporting(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/musicxml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ abc, display: displaySettings }),
      });
      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error ?? "MusicXML export failed.");
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `${songTitle.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "lead-sheet"}.musicxml`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setFeedback("MusicXML downloaded");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "MusicXML export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Header clerkConfigured={clerkConfigured} />

      <div
        className={`mx-auto grid min-h-[calc(100vh-58px)] max-[720px]:block ${
          persistenceEnabled ? "grid-cols-[208px_minmax(0,1fr)]" : "grid-cols-[minmax(0,1fr)]"
        }`}
      >
        <PrivateLibrarySidebar
          abc={abc}
          currentSong={currentSong}
          enabled={persistenceEnabled}
          isPublicSong={isPublicSong}
          onCurrentSongChange={handleCurrentSongChange}
          onMySongsChange={setPrivateSongs}
          onLoad={handleOpenPrivateSong}
          onStatus={handleStatus}
          recentSongIds={privateSongHistory}
          title={songTitle}
        />

        <main className="min-w-0 p-4 max-[1080px]:px-5.5 max-[1080px]:pt-7 max-[1080px]:pb-9 max-[720px]:px-3.5 max-[720px]:pt-5.5 max-[720px]:pb-7">
          {setListReturn && (
            <Link className="mb-4 inline-block text-xs font-semibold text-(--accent-deep) hover:underline" href={setListReturn.href}>
              ← Back to {setListReturn.name}
            </Link>
          )}
          <WorkspaceToolbar
            abc={abc}
            displaySettings={displaySettings}
            exporting={exporting}
            feedback={feedback}
            onDisplaySettingsChange={updateDisplaySettings}
            onExport={handleExport}
            onFileImport={handleFileImport}
            onNew={handleNewSong}
            onTitleChange={updateTitle}
            sourceLabel={sourceLabel}
            title={title}
          />

          {persistenceEnabled && setListReturn && (currentSong?.id === setListReturn.songId || selectedPublicSongId === setListReturn.songId) && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-(--line) bg-(--paper) px-4 py-3">
              <div>
                <p className="m-0 text-sm font-semibold">Performance settings for {setListReturn.name}</p>
                <p className="m-0 mt-1 text-xs text-(--muted-soft)">Save the current transpose and visibility choices to this set-list item.</p>
              </div>
              <SaveSetListDisplaySettingsButton
                displaySettings={displaySettings}
                itemId={setListReturn.itemId}
                onStatus={setFeedback}
                setListId={setListReturn.setListId}
              />
            </div>
          )}

          <div className="xl:flex xl:flex-cols-2 gap-4">
            <AbcEditorPanel
              abc={abc}
              copied={copied}
              isConvertible={Boolean(conversion)}
              lineCount={lineCount}
              onChange={handleAbcChange}
              onCopy={handleCopy}
              onFormat={handleFormat}
              saveStatus={saveStatus}
              sourceLength={sourceLength}
            />

            <PreviewPanel
              abc={abc}
              displaySettings={displaySettings}
              saveAction={
                <>
                  {persistenceEnabled && isPublicSong && (
                    <SaveToMyLibraryButton
                      abc={abc}
                      enabled={persistenceEnabled}
                      onCurrentSongChange={handleCurrentSongChange}
                      onSavedToMyLibrary={() => {
                        setSourceLabel("My song");
                        setIsPublicSong(false);
                        setSelectedPublicSongId(null);
                        setSourcePublicSongId(null);
                      }}
                      onStatus={handleStatus}
                      sourceSongId={sourcePublicSongId}
                      title={songTitle}
                    />
                  )}
                  <SaveToSetListButton
                    enabled={persistenceEnabled}
                    onStatus={handleStatus}
                    song={setListSong}
                  />
                </>
              }
              publishAction={
                persistenceEnabled && isPublicSong && publicLibraryIsPersisted && selectedPublicSongId ? (
                  <AdminUnpublishPublicSongButton
                    songId={selectedPublicSongId as Id<"songs">}
                    enabled={persistenceEnabled}
                    onStatus={handleStatus}
                  />
                ) : persistenceEnabled && !isPublicSong && currentSong ? (
                  <>
                    {currentSong.publicationState === "private" && (
                      <RemoveSongButton
                        enabled={persistenceEnabled}
                        onRemoved={() => {
                          if (!currentSong) return;
                          const replacement = findReplacementPrivateSong(
                            privateSongs,
                            privateSongHistory,
                            currentSong.id,
                          );
                          forgetRecentPrivateSong(currentSong.id);
                          if (replacement) {
                            handleOpenPrivateSong(replacement, `Removed ${currentSong.title}; opened ${replacement.title}`);
                          } else {
                            handleNewSong();
                          }
                        }}
                        onStatus={handleStatus}
                        song={currentSong}
                      />
                    )}
                    <AdminPublicationButton
                      enabled={persistenceEnabled}
                      onChanged={handleCurrentSongChange}
                      onStatus={handleStatus}
                      song={currentSong}
                    />
                  </>
                ) : null
              }
            />
          </div>
        </main>
      </div>
    </div>
  );
}
