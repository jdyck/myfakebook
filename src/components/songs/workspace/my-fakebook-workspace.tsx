"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { SongEditorDrawer } from "@/components/songs/editor/song-editor-drawer";
import { RemoveSongButton, SaveToMyLibraryButton } from "@/components/library/my-library/actions";
import { AdminPublicationButton, AdminPublicSongPublicationMenu } from "@/components/library/public-library/publication-actions";
import { SaveToSetListButton, SaveSetListDisplaySettingsButton } from "@/components/set-lists/actions";
import type { LoadedSong, SetListSong } from "@/components/songs/types";
import { Header } from "@/components/app-shell/header/header";
import { PreviewPanel } from "@/components/songs/preview/preview-panel";
import { MyLibrarySidebar } from "@/components/library/my-library/my-library-sidebar";
import { DisplayControls } from "@/components/songs/workspace/display-controls";
import { WorkspaceToolbar } from "@/components/songs/workspace/workspace-toolbar";
import { useRecentPrivateSongs } from "@/components/songs/workspace/use-recent-private-songs";
import type { Id } from "../../../../convex/_generated/dataModel";
import { resolveSongSource } from "@/lib/song-source";
import type { SongContent } from "@/lib/song-content";
import { abcToMusicXml, DEFAULT_ABC } from "@/lib/abc";
import { DEFAULT_DISPLAY_SETTINGS, type SongDisplaySettings } from "@/lib/abc-display";
import { downloadSongFile } from "@/lib/download-song-file";
import { svgToLetterPage, svgToPdf, svgToPng } from "@/lib/svg-pdf";
import type { PublicSong } from "@/lib/public-library";
import componentStyles from "./my-fakebook-workspace.module.css";

type SongViewProps = {
  clerkConfigured: boolean;
  persistenceEnabled: boolean;
  publishedSongs: readonly PublicSong[];
  publicLibraryIsPersisted?: boolean;
  initialPublicSongId?: string;
  initialPrivateSong?: LoadedSong;
  initialDisplaySettings?: SongDisplaySettings;
  initialEditMode?: boolean;
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

export function SongView({
  clerkConfigured,
  persistenceEnabled,
  publishedSongs,
  publicLibraryIsPersisted = false,
  initialPublicSongId,
  initialPrivateSong,
  initialDisplaySettings,
  initialEditMode = false,
  setListReturn,
}: SongViewProps) {
  const initialPublicSong = publishedSongs.find((song) => song.id === initialPublicSongId) ?? publishedSongs[0];
  const initialPrivateSongId = initialPrivateSong?.id;
  const [songSource, setSongSource] = useState(() => resolveSongSource(
    initialPrivateSong ?? initialPublicSong ?? { title: "Untitled", abc: DEFAULT_ABC },
  ));
  const { abc, abcParts, content } = songSource;
  const [title, setTitle] = useState(initialPrivateSong?.title ?? initialPublicSong?.title ?? "Untitled");
  const [isPublicSong, setIsPublicSong] = useState(!initialPrivateSong && Boolean(initialPublicSong));
  const [selectedPublicSongId, setSelectedPublicSongId] = useState<string | null>(initialPrivateSong ? null : initialPublicSong?.id ?? null);
  const [sourcePublicSongId, setSourcePublicSongId] = useState<string | null>(initialPrivateSong ? null : initialPublicSong?.id ?? null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [displaySettings, setDisplaySettings] = useState<SongDisplaySettings>(() => ({
    ...DEFAULT_DISPLAY_SETTINGS,
    ...initialDisplaySettings,
    showParts: initialDisplaySettings?.showParts ?? true,
    showFirstLineClefOnly: initialDisplaySettings?.showFirstLineClefOnly ?? true,
  }));
  const [currentSong, setCurrentSong] = useState<LoadedSong | null>(initialPrivateSong ?? null);
  const [mySongs, setMySongs] = useState<LoadedSong[]>(initialPrivateSong ? [initialPrivateSong] : []);
  const [editorOpen, setEditorOpen] = useState(initialEditMode);
  const renderedSvgRef = useRef<SVGSVGElement | null>(null);
  const {
    songIds: mySongHistory,
    recordSong: recordRecentPrivateSong,
    forgetSong: forgetRecentPrivateSong,
  } = useRecentPrivateSongs(initialPrivateSongId);

  const handleCurrentSongChange = useCallback(
    (song: LoadedSong | null) => {
      setCurrentSong(song);
    },
    [],
  );

  const conversion = useMemo(() => {
    try {
      return abcToMusicXml(abc);
    } catch {
      return null;
    }
  }, [abc]);

  const lineCount = abc.split("\n").length;
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
  function setAbc(value: string | ((current: string) => string)) {
    setSongSource((current) => resolveSongSource({ title: songTitle, abc: typeof value === "function" ? value(current.abc) : value }, current.abc));
  }

  function handleContentChange(nextContent: SongContent) {
    setSelectedPublicSongId(null);
    setSongSource((current) => resolveSongSource({ title: songTitle, content: nextContent }, current.abc));
  }

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
    setIsPublicSong(false);
    setSelectedPublicSongId(null);
    setSourcePublicSongId(null);
    setCurrentSong(null);
    setFeedback("Fresh lead sheet ready");
    setEditorOpen(true);
  }

  function handleOpenPrivateSong(song: LoadedSong, feedbackMessage = `Loaded ${song.title}`) {
    setCurrentSong(song);
    setTitle(song.title);
    setSongSource(resolveSongSource(song));
    setIsPublicSong(false);
    setSelectedPublicSongId(null);
    setSourcePublicSongId(null);
    recordRecentPrivateSong(song.id);
    setFeedback(feedbackMessage);
  }

  function handleFormat() {
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

  function handleAbcChange(value: string, parts?: string) {
    setSelectedPublicSongId(null);
    try {
      const nextSource = resolveSongSource({ title: songTitle, abc: value, abcParts: parts }, abc);
      setSongSource(nextSource);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Check the ABC parts.");
    }
  }

  async function handleCopy(value = abc) {
    try {
      await navigator.clipboard.writeText(value);
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
      downloadSongFile(blob, songTitle, "musicxml");
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
      downloadSongFile(blob, songTitle, "abc");
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
      downloadSongFile(blob, songTitle, "svg");
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
      downloadSongFile(png, songTitle, "png", 1000);
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
      downloadSongFile(pdf, songTitle, "pdf", 1000);
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
          abcParts={abcParts}
          content={content}
          currentSong={currentSong}
          enabled={persistenceEnabled}
          isPublicSong={isPublicSong}
          onNew={handleNewSong}
          onFileImport={handleFileImport}
          onCurrentSongChange={handleCurrentSongChange}
          onMySongsChange={setMySongs}
          onLoad={handleOpenPrivateSong}
          onStatus={setFeedback}
          recentSongIds={mySongHistory}
          title={songTitle}
        />

        <main aria-label="Song view" className={componentStyles.workspaceMain}>
          {setListReturn && (
            <Link className={componentStyles.setListReturnLink} href={setListReturn.href}>
              ← Back to {setListReturn.name}
            </Link>
          )}
          <div className={componentStyles.songViewContent}>
            <PreviewPanel
              abc={abc}
              displaySettings={displaySettings}
              workspaceToolbar={
                <WorkspaceToolbar
                  exporting={exporting}
                  onEdit={() => setEditorOpen(true)}
                  onExport={handleExport}
                  onExportAbc={handleExportAbc}
                  onExportSvg={handleExportSvg}
                  onExportPng={handleExportPng}
                  onExportPdf={handleExportPdf}
                />
              }
              displayControls={
                <>
                  <DisplayControls
                    abc={abc}
                    settings={displaySettings}
                    onChange={updateDisplaySettings}
                  />
                  {persistenceEnabled && setListReturn && (currentSong?.id === setListReturn.songId || selectedPublicSongId === setListReturn.songId) && (
                    <div className={componentStyles.setListSettingsAction}>
                      <p className={componentStyles.setListSettingsDescription}>
                        View changes are temporary. Save the current transpose and display options to keep them with this song in {setListReturn.name}.
                      </p>
                      <SaveSetListDisplaySettingsButton
                        displaySettings={displaySettings}
                        itemId={setListReturn.itemId}
                        onStatus={setFeedback}
                        setListId={setListReturn.setListId}
                      />
                    </div>
                  )}
                </>
              }
              onRenderedSvg={handleRenderedSvg}
              saveAction={
                <>
                  {persistenceEnabled && isPublicSong && (
                    <SaveToMyLibraryButton
                      abc={abc}
                      abcParts={abcParts}
                      content={content}
                      enabled={persistenceEnabled}
                      onCurrentSongChange={handleCurrentSongChange}
                      onSavedToMyLibrary={() => {
                        setIsPublicSong(false);
                        setSelectedPublicSongId(null);
                        setSourcePublicSongId(null);
                      }}
                      onStatus={setFeedback}
                      sourceSongId={sourcePublicSongId}
                      title={songTitle}
                    />
                  )}
                  <SaveToSetListButton
                    enabled={persistenceEnabled}
                    onStatus={setFeedback}
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
                    onStatus={setFeedback}
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
                        onStatus={setFeedback}
                        song={currentSong}
                      />
                    )}
                    <AdminPublicationButton
                      enabled={persistenceEnabled}
                      onChanged={handleCurrentSongChange}
                      onStatus={setFeedback}
                      song={currentSong}
                    />
                  </>
                ) : null
              }
            />

          </div>
          <SongEditorDrawer
            abc={abc}
            abcParts={abcParts}
            content={content}
            onContentChange={handleContentChange}
            copied={copied}
            feedback={feedback}
            isOpen={editorOpen}
            lineCount={lineCount}
            onChange={handleAbcChange}
            onClose={() => setEditorOpen(false)}
            onCopy={handleCopy}
            onFormat={handleFormat}
            onTitleChange={updateTitle}
            title={title}
          />
        </main>
      </div>
    </div>
  );
}
