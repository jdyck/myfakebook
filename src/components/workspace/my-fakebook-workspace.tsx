"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { AbcEditorPanel } from "@/components/workspace/abc-editor-panel";
import {
  AdminDeletePublicSongButton,
  AdminPublishButton,
  RemoveFromLibraryButton,
  SaveToLibraryButton,
  type LoadedScore,
} from "@/components/workspace/score-persistence";
import { Header } from "@/components/layout/header";
import { PreviewPanel } from "@/components/workspace/preview-panel";
import { PublicCatalog } from "@/components/workspace/public-catalog";
import { SavedChartsSidebar } from "@/components/workspace/saved-charts-sidebar";
import { WorkspaceToolbar } from "@/components/workspace/workspace-toolbar";
import type { Id } from "../../../convex/_generated/dataModel";
import { abcToMusicXml, DEFAULT_ABC } from "@/lib/abc";
import { DEFAULT_DISPLAY_SETTINGS, type ChartDisplaySettings } from "@/lib/abc-display";
import { PUBLIC_CATALOG, type PublicCatalogChart } from "@/lib/public-catalog";

type MyFakebookWorkspaceProps = {
  clerkConfigured: boolean;
  persistenceEnabled: boolean;
  catalog: readonly PublicCatalogChart[];
  catalogIsPersisted?: boolean;
};

function findReplacementCatalogChart(
  catalog: readonly PublicCatalogChart[],
  catalogHistory: readonly string[],
  excludedId: string | null,
) {
  for (const chartId of [...catalogHistory].reverse()) {
    const chart = catalog.find((candidate) => candidate.id === chartId);
    if (chart && chart.id !== excludedId) return chart;
  }

  return catalog.find((chart) => chart.id !== excludedId) ?? PUBLIC_CATALOG[0];
}

function findReplacementLibraryScore(
  scores: readonly LoadedScore[],
  libraryHistory: readonly string[],
  excludedId: string,
) {
  for (const scoreId of [...libraryHistory].reverse()) {
    const score = scores.find((candidate) => candidate.id === scoreId);
    if (score && score.id !== excludedId) return score;
  }

  return scores.find((score) => score.id !== excludedId) ?? null;
}

export function MyFakebookWorkspace({
  clerkConfigured,
  persistenceEnabled,
  catalog,
  catalogIsPersisted = false,
}: MyFakebookWorkspaceProps) {
  const initialCatalogChart = catalog[0] ?? PUBLIC_CATALOG[0];
  const [abc, setAbc] = useState(initialCatalogChart?.abc ?? DEFAULT_ABC);
  const [title, setTitle] = useState(initialCatalogChart?.title ?? "Midnight Walk");
  const [sourceLabel, setSourceLabel] = useState("Public catalog");
  const [isPublicCatalog, setIsPublicCatalog] = useState(true);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(initialCatalogChart?.id ?? null);
  const [catalogHistory, setCatalogHistory] = useState<string[]>(initialCatalogChart ? [initialCatalogChart.id] : []);
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState(persistenceEnabled ? "Connecting…" : "Saved locally");
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [displaySettings, setDisplaySettings] = useState<ChartDisplaySettings>(DEFAULT_DISPLAY_SETTINGS);
  const [currentScore, setCurrentScore] = useState<LoadedScore | null>(null);
  const [libraryScores, setLibraryScores] = useState<LoadedScore[]>([]);
  const [libraryHistory, setLibraryHistory] = useState<string[]>([]);

  const conversion = useMemo(() => {
    try {
      return abcToMusicXml(abc);
    } catch {
      return null;
    }
  }, [abc]);

  const lineCount = abc.split("\n").length;
  const sourceLength = abc.length;
  const scoreTitle = title.trim() || "Untitled lead sheet";
  function updateDisplaySettings(patch: Partial<ChartDisplaySettings>) {
    setDisplaySettings((current) => ({ ...current, ...patch }));
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const stored =
          window.localStorage.getItem("myfakebook:draft") ?? window.localStorage.getItem("notate:draft");
        if (stored) {
          const draft = JSON.parse(stored) as { title?: string; abc?: string };
          if (typeof draft.abc === "string" && draft.abc.trim()) setAbc(draft.abc);
          if (typeof draft.title === "string" && draft.title.trim()) setTitle(draft.title);
          if (typeof draft.abc === "string" && draft.abc.trim()) {
            setSourceLabel("Guest draft");
            setIsPublicCatalog(false);
            setSelectedCatalogId(null);
          }
        }
      } catch {
        // A local draft is a convenience; the editor should still load if storage is unavailable.
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (isPublicCatalog && selectedCatalogId) return;
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem("myfakebook:draft", JSON.stringify({ title, abc }));
      if (!persistenceEnabled) setSaveStatus("Saved locally");
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [abc, hydrated, isPublicCatalog, persistenceEnabled, selectedCatalogId, title]);

  const handleStatus = useCallback((status: string) => setSaveStatus(status), []);

  function updateTitle(value: string) {
    setSourceLabel(isPublicCatalog ? "Public catalog edit" : "Guest draft");
    setSelectedCatalogId(null);
    setTitle(value);
    setAbc((current) => {
      if (/^T:.*$/m.test(current)) return current.replace(/^T:.*$/m, `T:${value}`);
      return `T:${value}\n${current}`;
    });
  }

  function handleNewScore() {
    setTitle("Midnight Walk");
    setAbc(DEFAULT_ABC);
    setSourceLabel("Guest draft");
    setIsPublicCatalog(false);
    setSelectedCatalogId(null);
    setCurrentScore(null);
    setFeedback("Fresh lead sheet ready");
  }

  function handleOpenLibraryScore(score: LoadedScore, feedbackMessage = `Loaded ${score.title}`) {
    setCurrentScore(score);
    setTitle(score.title);
    setAbc(score.abc);
    setSourceLabel("My Songs");
    setIsPublicCatalog(false);
    setSelectedCatalogId(null);
    setLibraryHistory((history) => [...history.filter((id) => id !== score.id), score.id]);
    setFeedback(feedbackMessage);
  }

  function handleFormat() {
    setSourceLabel(isPublicCatalog ? "Public catalog edit" : "Guest draft");
    setSelectedCatalogId(null);
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

  function handleOpenCatalogChart(chart: PublicCatalogChart) {
    try {
      window.localStorage.removeItem("myfakebook:draft");
      window.localStorage.removeItem("notate:draft");
    } catch {
      // A catalog selection should still work when browser storage is unavailable.
    }
    setTitle(chart.title);
    setAbc(chart.abc);
    setSourceLabel("Public catalog");
    setIsPublicCatalog(true);
    setSelectedCatalogId(chart.id);
    setCatalogHistory((history) => [...history.filter((id) => id !== chart.id), chart.id]);
    setCurrentScore(null);
    setFeedback(`Opened ${chart.title} from the public catalog`);
  }

  useEffect(() => {
    if (!isPublicCatalog || !selectedCatalogId || catalog.some((chart) => chart.id === selectedCatalogId)) return;

    const nextChart = findReplacementCatalogChart(catalog, catalogHistory, selectedCatalogId);
    if (!nextChart) return;

    const timeout = window.setTimeout(() => {
      setTitle(nextChart.title);
      setAbc(nextChart.abc);
      setSourceLabel("Public catalog");
      setSelectedCatalogId(nextChart.id);
      setCurrentScore(null);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [catalog, catalogHistory, isPublicCatalog, selectedCatalogId]);

  function handleAbcChange(value: string) {
    setSourceLabel(isPublicCatalog ? "Public catalog edit" : "Guest draft");
    setSelectedCatalogId(null);
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
      anchor.download = `${scoreTitle.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "lead-sheet"}.musicxml`;
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
        <SavedChartsSidebar
          abc={abc}
          currentScore={currentScore}
          enabled={persistenceEnabled}
          hydrated={hydrated}
          isPublicCatalog={isPublicCatalog}
          onCurrentScoreChange={setCurrentScore}
          onLibraryScoresChange={setLibraryScores}
          onLoad={handleOpenLibraryScore}
          onStatus={handleStatus}
          title={scoreTitle}
        />

        <main className="min-w-0 p-4 max-[1080px]:px-5.5 max-[1080px]:pt-7 max-[1080px]:pb-9 max-[720px]:px-3.5 max-[720px]:pt-5.5 max-[720px]:pb-7">
          <PublicCatalog
            catalog={catalog}
            onOpenChart={handleOpenCatalogChart}
            selectedCatalogId={selectedCatalogId}
          />

          <WorkspaceToolbar
            abc={abc}
            displaySettings={displaySettings}
            exporting={exporting}
            feedback={feedback}
            onDisplaySettingsChange={updateDisplaySettings}
            onExport={handleExport}
            onFileImport={handleFileImport}
            onNew={handleNewScore}
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
                persistenceEnabled && isPublicCatalog ? (
                  <SaveToLibraryButton
                    abc={abc}
                    enabled={persistenceEnabled}
                    hydrated={hydrated}
                    onCurrentScoreChange={setCurrentScore}
                    onSavedToLibrary={() => {
                      setSourceLabel("My Songs");
                      setIsPublicCatalog(false);
                      setSelectedCatalogId(null);
                    }}
                    onStatus={handleStatus}
                    title={scoreTitle}
                  />
                ) : null
              }
              publishAction={
                persistenceEnabled && isPublicCatalog && catalogIsPersisted && selectedCatalogId ? (
                  <AdminDeletePublicSongButton
                    catalogId={selectedCatalogId as Id<"catalogCharts">}
                    enabled={persistenceEnabled}
                    onDeleted={() => {
                      const replacement = findReplacementCatalogChart(catalog, catalogHistory, selectedCatalogId);
                      if (replacement) {
                        handleOpenCatalogChart(replacement);
                        setFeedback(`Deleted public song; opened ${replacement.title}`);
                      } else {
                        setSelectedCatalogId(null);
                        setFeedback("Public song deleted");
                      }
                    }}
                    onStatus={handleStatus}
                  />
                ) : persistenceEnabled && !isPublicCatalog && currentScore ? (
                  <>
                    <RemoveFromLibraryButton
                      enabled={persistenceEnabled}
                      onRemoved={() => {
                        if (!currentScore) return;
                        const replacement = findReplacementLibraryScore(
                          libraryScores,
                          libraryHistory,
                          currentScore.id,
                        );
                        setLibraryHistory((history) => history.filter((id) => id !== currentScore.id));
                        if (replacement) {
                          handleOpenLibraryScore(replacement, `Removed ${currentScore.title}; opened ${replacement.title}`);
                        } else {
                          handleNewScore();
                        }
                      }}
                      onStatus={handleStatus}
                      score={currentScore}
                    />
                    <AdminPublishButton enabled={persistenceEnabled} onStatus={handleStatus} score={currentScore} />
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
