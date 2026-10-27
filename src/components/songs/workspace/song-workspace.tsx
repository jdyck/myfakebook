"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { SongEditorDrawer } from "@/components/songs/editor/song-editor-drawer";
import { RemoveSongButton, SaveToMyLibraryButton } from "@/components/library/my-library/actions";
import { AdminPublicationButton, AdminPublicSongPublicationMenu } from "@/components/library/public-library/publication-actions";
import { SaveToBinderButton, SaveBinderDisplaySettingsButton } from "@/components/binders/actions";
import type { LoadedSong, BinderSong } from "@/lib/songs/types";
import { Header } from "@/components/app-shell/header/header";
import { PreviewPanel } from "@/components/songs/preview/preview-panel";
import { MyLibrarySidebar } from "@/components/library/my-library/my-library-sidebar";
import { DisplayControls } from "@/components/songs/workspace/display-controls";
import { WorkspaceToolbar } from "@/components/songs/workspace/workspace-toolbar";
import { useRecentPrivateSongs } from "@/components/songs/workspace/use-recent-private-songs";
import type { Id } from "../../../../convex/_generated/dataModel";
import { resolveSongSource } from "@/lib/songs/song-source";
import type { SongContent } from "@/lib/songs/song-content";
import { DEFAULT_ABC } from "@/lib/notation/abc";
import { DEFAULT_DISPLAY_SETTINGS, type SongDisplaySettings } from "@/lib/notation/abc-display";
import type { PublicSong } from "@/lib/songs/public-library";
import { useSongExport } from "./use-song-export";
import { SongHeading } from "./song-heading";
import componentStyles from "./song-workspace.module.css";

type SongWorkspaceProps = {
  clerkConfigured: boolean;
  persistenceEnabled: boolean;
  publishedSongs: readonly PublicSong[];
  publicLibraryIsPersisted?: boolean;
  initialPublicSongId?: string;
  initialPrivateSong?: LoadedSong;
  initialDisplaySettings?: SongDisplaySettings;
  initialEditMode?: boolean;
  binderReturn?: {
    href: string;
    name: string;
    binderId: Id<"binders">;
    itemId: Id<"binderItems">;
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

export function SongWorkspace({
  clerkConfigured,
  persistenceEnabled,
  publishedSongs,
  publicLibraryIsPersisted = false,
  initialPublicSongId,
  initialPrivateSong,
  initialDisplaySettings,
  initialEditMode = false,
  binderReturn,
}: SongWorkspaceProps) {
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
  const [feedback, setFeedback] = useState<string | null>(null);
  const [displaySettings, setDisplaySettings] = useState<SongDisplaySettings>(() => ({
    ...DEFAULT_DISPLAY_SETTINGS,
    ...initialDisplaySettings,
    showParts: initialDisplaySettings?.showParts ?? true,
    showFirstLineClefOnly: initialDisplaySettings?.showFirstLineClefOnly ?? true,
  }));
  const [currentSong, setCurrentSong] = useState<LoadedSong | null>(initialPrivateSong ?? null);
  const [hasSongEdits, setHasSongEdits] = useState(false);
  const [mySongs, setMySongs] = useState<LoadedSong[]>(initialPrivateSong ? [initialPrivateSong] : []);
  const [editorOpen, setEditorOpen] = useState(initialEditMode);
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

  const lineCount = abc.split("\n").length;
  const songTitle = title.trim() || "Untitled lead sheet";
  const {
    exporting,
    handleRenderedSvg,
    handleExport,
    handleExportAbc,
    handleExportSvg,
    handleExportPng,
    handleExportPdf,
  } = useSongExport({ abc, songTitle, displaySettings, onStatus: setFeedback });
  const selectedPublicSong = selectedPublicSongId
    ? publishedSongs.find((song) => song.id === selectedPublicSongId)
    : undefined;
  const binderSong: BinderSong | null = isPublicSong
    ? publicLibraryIsPersisted && selectedPublicSong && (selectedPublicSong.publicationTerritory ?? "worldwide") === "worldwide"
      ? { id: selectedPublicSong.id as Id<"songs">, title: songTitle }
      : null
    : currentSong
      ? { id: currentSong.id, title: currentSong.title }
      : null;
  function setAbc(value: string | ((current: string) => string)) {
    setHasSongEdits(true);
    setSongSource((current) => resolveSongSource({ title: songTitle, abc: typeof value === "function" ? value(current.abc) : value }, current.abc));
  }

  function handleContentChange(nextContent: SongContent) {
    setHasSongEdits(true);
    setSelectedPublicSongId(null);
    setSongSource((current) => resolveSongSource({ title: songTitle, content: nextContent }, current.abc));
  }

  function updateDisplaySettings(patch: Partial<SongDisplaySettings>) {
    setDisplaySettings((current) => ({ ...current, ...patch }));
  }

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    try {
      window.localStorage.removeItem("myfakebook:draft");
      window.localStorage.removeItem("notate:draft");
    } catch {
      // Editing should still work when browser storage is unavailable.
    }
  }, []);

  function updateTitle(value: string) {
    setHasSongEdits(true);
    setSelectedPublicSongId(null);
    setTitle(value);
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
    setHasSongEdits(false);
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
      setHasSongEdits(true);
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

  return (
    <div className={componentStyles.appShell}>
      <a className={componentStyles.skipLink} href="#song-score">Skip to the score</a>
      <Header clerkConfigured={clerkConfigured} activeSection={isPublicSong ? "songs" : "library"} />

      <main aria-label="Song view" className={componentStyles.pageContent}>
      <SongHeading
        abc={abc}
        title={songTitle}
        transposition={displaySettings.transposition}
        song={currentSong ?? (selectedPublicSong ? { publicationState: "published", publicationTerritory: selectedPublicSong.publicationTerritory } : null)}
        isPublicSong={isPublicSong}
      />
      <div
        className={`${componentStyles.workspaceGrid} ${
          persistenceEnabled ? componentStyles.workspaceGridWithSidebar : componentStyles.workspaceGridWithoutSidebar
        }`}
      >
        <MyLibrarySidebar
          hasSongEdits={hasSongEdits}
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

        <div className={componentStyles.workspaceMain}>
          {binderReturn && (
            <Link className={componentStyles.binderReturnLink} href={binderReturn.href}>
              ← Back to {binderReturn.name}
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
                  {persistenceEnabled && binderReturn && (currentSong?.id === binderReturn.songId || selectedPublicSongId === binderReturn.songId) && (
                    <div className={componentStyles.binderSettingsAction}>
                      <p className={componentStyles.binderSettingsDescription}>
                        View changes are temporary. Save the current transpose and display options to keep them with this song in {binderReturn.name}.
                      </p>
                      <SaveBinderDisplaySettingsButton
                        displaySettings={displaySettings}
                        itemId={binderReturn.itemId}
                        onStatus={setFeedback}
                        binderId={binderReturn.binderId}
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
                  <SaveToBinderButton
                    enabled={persistenceEnabled}
                    onStatus={setFeedback}
                    song={binderSong}
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
        </div>
      </div>
      </main>
      {feedback && <p className={componentStyles.status} role="status">{feedback}</p>}
    </div>
  );
}
