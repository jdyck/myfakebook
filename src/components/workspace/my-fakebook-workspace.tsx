"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { AbcEditorPanel } from "@/components/workspace/abc-editor-panel";
import {
  AdminDeletePublicSongButton,
  AdminPublishButton,
  RemovePrivateSongButton,
  SaveToPrivateLibraryButton,
  type LoadedSong,
} from "@/components/workspace/song-persistence";
import { Header } from "@/components/layout/header";
import { PreviewPanel } from "@/components/workspace/preview-panel";
import { PublicLibrary } from "@/components/workspace/public-library";
import { PrivateLibrarySidebar } from "@/components/workspace/private-library-sidebar";
import { WorkspaceToolbar } from "@/components/workspace/workspace-toolbar";
import type { Id } from "../../../convex/_generated/dataModel";
import { abcToMusicXml, DEFAULT_ABC } from "@/lib/abc";
import { DEFAULT_DISPLAY_SETTINGS, type SongDisplaySettings } from "@/lib/abc-display";
import { PUBLIC_LIBRARY, type PublicSong } from "@/lib/public-library";

type MyFakebookWorkspaceProps = {
  clerkConfigured: boolean;
  persistenceEnabled: boolean;
  publicSongs: readonly PublicSong[];
  publicLibraryIsPersisted?: boolean;
};

function findReplacementPublicSong(
  publicSongs: readonly PublicSong[],
  publicSongHistory: readonly string[],
  excludedId: string | null,
) {
  for (const songId of [...publicSongHistory].reverse()) {
    const song = publicSongs.find((candidate) => candidate.id === songId);
    if (song && song.id !== excludedId) return song;
  }

  return publicSongs.find((song) => song.id !== excludedId) ?? PUBLIC_LIBRARY[0];
}

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
}: MyFakebookWorkspaceProps) {
  const initialPublicSong = publicSongs[0] ?? PUBLIC_LIBRARY[0];
  const [abc, setAbc] = useState(initialPublicSong?.abc ?? DEFAULT_ABC);
  const [title, setTitle] = useState(initialPublicSong?.title ?? "Midnight Walk");
  const [sourceLabel, setSourceLabel] = useState("Public song");
  const [isPublicSong, setIsPublicSong] = useState(true);
  const [selectedPublicSongId, setSelectedPublicSongId] = useState<string | null>(initialPublicSong?.id ?? null);
  const [publicSongHistory, setPublicSongHistory] = useState<string[]>(initialPublicSong ? [initialPublicSong.id] : []);
  const [saveStatus, setSaveStatus] = useState(persistenceEnabled ? "Connecting…" : "Not saved");
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [displaySettings, setDisplaySettings] = useState<SongDisplaySettings>(DEFAULT_DISPLAY_SETTINGS);
  const [currentSong, setCurrentSong] = useState<LoadedSong | null>(null);
  const [privateSongs, setPrivateSongs] = useState<LoadedSong[]>([]);
  const [privateSongHistory, setPrivateSongHistory] = useState<string[]>([]);

  const handleCurrentSongChange = useCallback(
    (song: LoadedSong | null) => {
      setCurrentSong(song);
      if (song && !isPublicSong) setSourceLabel("Private song");
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
    setCurrentSong(null);
    setFeedback("Fresh lead sheet ready");
  }

  function handleOpenPrivateSong(song: LoadedSong, feedbackMessage = `Loaded ${song.title}`) {
    setCurrentSong(song);
    setTitle(song.title);
    setAbc(song.abc);
    setSourceLabel("Private song");
    setIsPublicSong(false);
    setSelectedPublicSongId(null);
    setPrivateSongHistory((history) => [...history.filter((id) => id !== song.id), song.id]);
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

  function handleOpenPublicSong(song: PublicSong) {
    setTitle(song.title);
    setAbc(song.abc);
    setSourceLabel("Public song");
    setIsPublicSong(true);
    setSelectedPublicSongId(song.id);
    setPublicSongHistory((history) => [...history.filter((id) => id !== song.id), song.id]);
    setCurrentSong(null);
    setFeedback(`Opened ${song.title} from the Public Library`);
  }

  useEffect(() => {
    if (!isPublicSong || !selectedPublicSongId || publicSongs.some((song) => song.id === selectedPublicSongId)) return;

    const nextSong = findReplacementPublicSong(publicSongs, publicSongHistory, selectedPublicSongId);
    if (!nextSong) return;

    const timeout = window.setTimeout(() => {
      setTitle(nextSong.title);
      setAbc(nextSong.abc);
      setSourceLabel("Public song");
      setSelectedPublicSongId(nextSong.id);
      setCurrentSong(null);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [publicSongs, publicSongHistory, isPublicSong, selectedPublicSongId]);

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
          onPrivateSongsChange={setPrivateSongs}
          onLoad={handleOpenPrivateSong}
          onStatus={handleStatus}
          title={songTitle}
        />

        <main className="min-w-0 p-4 max-[1080px]:px-5.5 max-[1080px]:pt-7 max-[1080px]:pb-9 max-[720px]:px-3.5 max-[720px]:pt-5.5 max-[720px]:pb-7">
          <PublicLibrary
            songs={publicSongs}
            onOpenSong={handleOpenPublicSong}
            selectedSongId={selectedPublicSongId}
          />

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
                persistenceEnabled && isPublicSong ? (
                  <SaveToPrivateLibraryButton
                    abc={abc}
                    enabled={persistenceEnabled}
                    onCurrentSongChange={handleCurrentSongChange}
                    onSavedToPrivateLibrary={() => {
                      setSourceLabel("Private song");
                      setIsPublicSong(false);
                      setSelectedPublicSongId(null);
                    }}
                    onStatus={handleStatus}
                    title={songTitle}
                  />
                ) : null
              }
              publishAction={
                persistenceEnabled && isPublicSong && publicLibraryIsPersisted && selectedPublicSongId ? (
                  <AdminDeletePublicSongButton
                    publicSongId={selectedPublicSongId as Id<"publicSongs">}
                    enabled={persistenceEnabled}
                    onDeleted={() => {
                      const replacement = findReplacementPublicSong(publicSongs, publicSongHistory, selectedPublicSongId);
                      if (replacement) {
                        handleOpenPublicSong(replacement);
                        setFeedback(`Deleted public song; opened ${replacement.title}`);
                      } else {
                        setSelectedPublicSongId(null);
                        setFeedback("Public song deleted");
                      }
                    }}
                    onStatus={handleStatus}
                  />
                ) : persistenceEnabled && !isPublicSong && currentSong ? (
                  <>
                    <RemovePrivateSongButton
                      enabled={persistenceEnabled}
                      onRemoved={() => {
                        if (!currentSong) return;
                        const replacement = findReplacementPrivateSong(
                          privateSongs,
                          privateSongHistory,
                          currentSong.id,
                        );
                        setPrivateSongHistory((history) => history.filter((id) => id !== currentSong.id));
                        if (replacement) {
                          handleOpenPrivateSong(replacement, `Removed ${currentSong.title}; opened ${replacement.title}`);
                        } else {
                          handleNewSong();
                        }
                      }}
                      onStatus={handleStatus}
                      song={currentSong}
                    />
                    <AdminPublishButton enabled={persistenceEnabled} onStatus={handleStatus} song={currentSong} />
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
