"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ChangeEvent } from "react";
import Link from "next/link";
import { AbcEditorPanel } from "@/components/songs/editor/abc-editor-panel";
import { RemoveSongButton, SaveToMyLibraryButton } from "@/components/library/my-library/actions";
import { AdminPublicationButton, AdminPublicSongPublicationMenu } from "@/components/library/public-library/publication-actions";
import { SaveToSetListButton, SaveSetListDisplaySettingsButton } from "@/components/set-lists/actions";
import type { LoadedSong, SetListSong } from "@/components/songs/types";
import { Header } from "@/components/app-shell/header/header";
import { PreviewPanel } from "@/components/songs/preview/preview-panel";
import { MyLibrarySidebar } from "@/components/library/my-library/my-library-sidebar";
import { WorkspaceToolbar } from "@/components/songs/workspace/workspace-toolbar";
import type { Id } from "../../../../convex/_generated/dataModel";
import { abcToMusicXml, DEFAULT_ABC } from "@/lib/abc";
import { DEFAULT_DISPLAY_SETTINGS, type SongDisplaySettings } from "@/lib/abc-display";
import { svgToLetterPage, svgToPdf, svgToPng } from "@/lib/svg-pdf";
import type { PublicSong } from "@/lib/public-library";
import componentStyles from "./my-fakebook-workspace.module.css";

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
  publishedSongs: readonly PublicSong[];
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

function findReplacementMySong(
  songs: readonly LoadedSong[],
  mySongHistory: readonly string[],
  excludedId: string,
) {
  for (const songId of [...mySongHistory].reverse()) {
    const song = songs.find((candidate) => candidate.id === songId);
    if (song && song.id !== excludedId) return song;
  }

  return songs.find((song) => song.id !== excludedId) ?? null;
}

export function MyFakebookWorkspace({
  clerkConfigured,
  persistenceEnabled,
  publishedSongs,
  publicLibraryIsPersisted = false,
  initialPublicSongId,
  initialPrivateSong,
  initialDisplaySettings,
  setListReturn,
}: MyFakebookWorkspaceProps) {
  const initialPublicSong = publishedSongs.find((song) => song.id === initialPublicSongId) ?? publishedSongs[0];
  const initialPrivateSongId = initialPrivateSong?.id;
  const [abc, setAbc] = useState(initialPrivateSong?.abc ?? initialPublicSong?.abc ?? DEFAULT_ABC);
  const [title, setTitle] = useState(initialPrivateSong?.title ?? initialPublicSong?.title ?? "Untitled");
  const [sourceLabel, setSourceLabel] = useState(initialPrivateSong ? (initialPrivateSong.publicationState === "published" ? "Published song" : "Private song") : initialPublicSong ? "Public song" : "New song");
  const [isPublicSong, setIsPublicSong] = useState(!initialPrivateSong && Boolean(initialPublicSong));
  const [selectedPublicSongId, setSelectedPublicSongId] = useState<string | null>(initialPrivateSong ? null : initialPublicSong?.id ?? null);
  const [sourcePublicSongId, setSourcePublicSongId] = useState<string | null>(initialPrivateSong ? null : initialPublicSong?.id ?? null);
  const [saveStatus, setSaveStatus] = useState(persistenceEnabled ? "Connecting…" : "Not saved");
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [displaySettings, setDisplaySettings] = useState<SongDisplaySettings>(() => ({
    ...DEFAULT_DISPLAY_SETTINGS,
    ...initialDisplaySettings,
    showFirstLineClefOnly: initialDisplaySettings?.showFirstLineClefOnly ?? false,
  }));
  const [currentSong, setCurrentSong] = useState<LoadedSong | null>(initialPrivateSong ?? null);
  const [mySongs, setMySongs] = useState<LoadedSong[]>(initialPrivateSong ? [initialPrivateSong] : []);
  const renderedSvgRef = useRef<SVGSVGElement | null>(null);
  const recentPrivateSongSnapshotValue = useSyncExternalStore(
    subscribeToRecentPrivateSongs,
    getRecentPrivateSongSnapshot,
    () => "[]",
  );
  const mySongHistory = useMemo(
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
    ? publishedSongs.find((song) => song.id === selectedPublicSongId)
    : undefined;
  const setListSong: SetListSong | null = isPublicSong
    ? publicLibraryIsPersisted && selectedPublicSong && (selectedPublicSong.publicationTerritory ?? "worldwide") === "worldwide"
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
  const handleRenderedSvg = useCallback((svg: SVGSVGElement | null) => {
    renderedSvgRef.current = svg;
  }, []);

  function createExportSvg() {
    const renderedSvg = renderedSvgRef.current;
    if (!renderedSvg) return null;

    const svg = renderedSvg.cloneNode(true) as SVGSVGElement;
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.querySelectorAll(".abcjs-note-playing, .abcjs-note-start-selected").forEach((element) => {
      element.classList.remove("abcjs-note-playing", "abcjs-note-start-selected");
    });
    if (!displaySettings.showChords) svg.querySelectorAll(".abcjs-chord").forEach((element) => element.remove());
    if (!displaySettings.showLyrics) svg.querySelectorAll(".abcjs-lyric").forEach((element) => element.remove());

    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = `
      text:not(.abcjs-chord), text:not(.abcjs-chord) tspan { font-family: Inter, Arial, sans-serif; }
      .abcjs-title, .abcjs-title tspan { font-weight: 700; }
      .abcjs-lyric, .abcjs-lyric tspan { font-weight: 300; }
      .abcjs-chord, .abcjs-chord tspan {
        font-family: "Bravura Chord Symbols", Inter, Arial, sans-serif;
        letter-spacing: -0.04em;
      }
    `;
    svg.insertBefore(style, svg.firstChild);

    return svg;
  }

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
    setTitle("Untitled");
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

  function handleExportAbc() {
    try {
      const blob = new Blob([abc], { type: "text/vnd.abc;charset=utf-8" });
      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `${songTitle.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "lead-sheet"}.abc`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setFeedback("ABC downloaded");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "ABC export failed");
    }
  }

  function handleExportSvg() {
    const svg = createExportSvg();
    if (!svg) {
      setFeedback("The lead sheet preview is not ready for SVG export");
      return;
    }

    try {
      const letterPage = svgToLetterPage(svg);
      const blob = new Blob([new XMLSerializer().serializeToString(letterPage)], { type: "image/svg+xml;charset=utf-8" });
      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `${songTitle.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "lead-sheet"}.svg`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setFeedback("SVG downloaded");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "SVG export failed");
    }
  }

  async function handleExportPng() {
    const svg = createExportSvg();
    if (!svg) {
      setFeedback("The lead sheet preview is not ready for PNG export");
      return;
    }

    setExporting(true);
    setFeedback(null);
    try {
      const png = await svgToPng(svg);
      const downloadUrl = window.URL.createObjectURL(png);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `${songTitle.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "lead-sheet"}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);
      setFeedback("PNG downloaded");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "PNG export failed");
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPdf() {
    const svg = createExportSvg();
    if (!svg) {
      setFeedback("The lead sheet preview is not ready for PDF export");
      return;
    }

    setExporting(true);
    try {
      const pdf = await svgToPdf(svg);
      const downloadUrl = window.URL.createObjectURL(pdf);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `${songTitle.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "lead-sheet"}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);
      setFeedback("PDF downloaded");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "PDF export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className={componentStyles.appShell}>
      <Header clerkConfigured={clerkConfigured} />

      <div
        className={`${componentStyles.workspaceGrid} ${
          persistenceEnabled ? componentStyles.workspaceGridWithSidebar : componentStyles.workspaceGridWithoutSidebar
        }`}
      >
        <MyLibrarySidebar
          abc={abc}
          currentSong={currentSong}
          enabled={persistenceEnabled}
          isPublicSong={isPublicSong}
          onCurrentSongChange={handleCurrentSongChange}
          onMySongsChange={setMySongs}
          onLoad={handleOpenPrivateSong}
          onStatus={handleStatus}
          recentSongIds={mySongHistory}
          title={songTitle}
        />

        <main className={componentStyles.workspaceMain}>
          {setListReturn && (
            <Link className={componentStyles.setListReturnLink} href={setListReturn.href}>
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
            onExportAbc={handleExportAbc}
            onExportSvg={handleExportSvg}
            onExportPng={handleExportPng}
            onExportPdf={handleExportPdf}
            onFileImport={handleFileImport}
            onNew={handleNewSong}
            onTitleChange={updateTitle}
            sourceLabel={sourceLabel}
            title={title}
          />

          {persistenceEnabled && setListReturn && (currentSong?.id === setListReturn.songId || selectedPublicSongId === setListReturn.songId) && (
            <div className={componentStyles.setListSettingsBanner}>
              <div>
                <p className={componentStyles.settingsBannerTitle}>Performance settings for {setListReturn.name}</p>
                <p className={componentStyles.settingsBannerDescription}>Save the current transpose and visibility choices to this set-list item.</p>
              </div>
              <SaveSetListDisplaySettingsButton
                displaySettings={displaySettings}
                itemId={setListReturn.itemId}
                onStatus={setFeedback}
                setListId={setListReturn.setListId}
              />
            </div>
          )}

          <div className={componentStyles.editorAndPreview}>
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
              onRenderedSvg={handleRenderedSvg}
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
                  <AdminPublicSongPublicationMenu
                    enabled={persistenceEnabled}
                    song={selectedPublicSong ? {
                      id: selectedPublicSong.id as Id<"songs">,
                      title: selectedPublicSong.title,
                      abc: selectedPublicSong.abc,
                      publicationState: "published",
                      publicationTerritory: selectedPublicSong.publicationTerritory ?? "worldwide",
                    } : null}
                    onStatus={handleStatus}
                  />
                ) : persistenceEnabled && !isPublicSong && currentSong ? (
                  <>
                    {currentSong.publicationState === "private" && (
                      <RemoveSongButton
                        enabled={persistenceEnabled}
                        onRemoved={() => {
                          if (!currentSong) return;
                          const replacement = findReplacementMySong(
                            mySongs,
                            mySongHistory,
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
