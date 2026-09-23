"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  FileMusic,
  Music2,
  Plus,
  Settings2,
  Upload,
} from "lucide-react";

import { AuthControls } from "@/components/auth-controls";
import { AbcPreview } from "@/components/abc-preview";
import {
  AdminDeletePublicSongButton,
  AdminPublishButton,
  RemoveFromLibraryButton,
  SaveToLibraryButton,
  ScorePersistence,
  type LoadedScore,
} from "@/components/score-persistence";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Id } from "../../convex/_generated/dataModel";
import { abcToMusicXml, DEFAULT_ABC, type MusicXmlResult } from "@/lib/abc";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const conversion = useMemo<MusicXmlResult | null>(() => {
    try {
      return abcToMusicXml(abc);
    } catch {
      return null;
    }
  }, [abc]);

  const lineCount = abc.split("\n").length;
  const sourceLength = abc.length;
  const scoreTitle = title.trim() || "Untitled lead sheet";
  const keyLabel = abc.match(/^K:\s*(.*)$/m)?.[1]?.trim() || "C";
  const meterLabel = abc.match(/^M:\s*(.*)$/m)?.[1]?.trim() || "4/4";
  const tempoLabel = abc.match(/^Q:.*?=\s*(\d+)/m)?.[1] || abc.match(/^Q:\s*(\d+)/m)?.[1] || "";

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

  function handleFileImport(event: React.ChangeEvent<HTMLInputElement>) {
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
      <header className="sticky top-0 z-20 flex min-h-[58px] items-center justify-between border-b border-[var(--line)] bg-[var(--paper)] px-6 max-[720px]:min-h-[54px] max-[720px]:px-3.5">
        <div className="flex items-center gap-[9px]">
          <div className="grid size-7 place-items-center rounded-[8px] bg-[var(--accent)] text-white" aria-hidden="true">
            <Music2 size={17} strokeWidth={2.2} />
          </div>
          <span className="text-[15px] font-[760] tracking-[-0.025em] text-[var(--ink)]">MyFakebook</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AuthControls configured={clerkConfigured} />
        </div>
      </header>

      <div
        className={`mx-auto grid min-h-[calc(100vh-58px)] max-w-[1440px] grid-cols-[minmax(0,1fr)] max-[720px]:block ${
          persistenceEnabled ? "grid-cols-[208px_minmax(0,1fr)]" : ""
        }`}
      >
        {persistenceEnabled && (
          <aside
            className="min-w-0 border-r border-[var(--line)] px-[15px] py-[25px] max-[720px]:hidden"
            aria-label="Saved charts"
          >
            <div className="grid gap-1 px-2">
              <span className="text-[13px] font-[680] text-[var(--ink)]">Saved charts</span>
            </div>
            <ScorePersistence
              abc={abc}
              enabled={persistenceEnabled}
              hydrated={hydrated}
              isPublicCatalog={isPublicCatalog}
              currentScore={currentScore}
              onCurrentScoreChange={setCurrentScore}
              onLibraryScoresChange={setLibraryScores}
              onLoad={(score) => {
                handleOpenLibraryScore(score);
              }}
              onStatus={handleStatus}
              title={scoreTitle}
            />
          </aside>
        )}

        <main className="min-w-0 max-[1080px]:px-[22px] max-[1080px]:pt-7 max-[1080px]:pb-9 max-[720px]:px-3.5 max-[720px]:pt-[22px] max-[720px]:pb-7">
          <section
            aria-labelledby="public-catalog-heading"
            className="mb-5 rounded-[11px] border border-[var(--line)] bg-[var(--paper)] px-4 py-3.5"
          >
            <div className="mb-2.5 flex items-baseline justify-between gap-3">
              <div>
                <h2 id="public-catalog-heading" className="m-0 text-[12px] font-[720] text-[var(--ink)]">
                  Public catalog
                </h2>
                <p className="m-0 mt-1 text-[10px] text-[var(--muted-soft)]">Published charts available to every guest.</p>
              </div>
              <span className="font-mono text-[9px] text-[var(--muted-soft)]">{catalog.length} chart{catalog.length === 1 ? "" : "s"}</span>
            </div>
            <div className="grid gap-1.5">
              {catalog.map((chart) => {
                const isSelected = selectedCatalogId === chart.id;
                return (
                  <button
                    aria-pressed={isSelected}
                    className={`flex w-full items-center justify-between gap-3 rounded-[8px] border px-3 py-2 text-left transition-[border-color,background-color] duration-[160ms] ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                      isSelected
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : "border-[var(--line)] bg-[var(--paper-soft)] hover:border-[var(--line-strong)]"
                    }`}
                    key={chart.id}
                    type="button"
                    onClick={() => handleOpenCatalogChart(chart)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-[680] text-[var(--ink)]">{chart.title}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-[var(--muted-soft)]">
                        {chart.writers} · {chart.rhythm}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] font-[650] text-[var(--accent-deep)]">
                      {isSelected ? "Open" : "View"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="mb-5 flex items-start justify-between gap-6 max-[720px]:block">
            <div className="min-w-0 flex-1">
              <h1 className="m-0">
                <input
                  aria-label="Lead sheet title"
                  className="block w-full max-w-[520px] border-0 border-b border-b-transparent bg-transparent text-[clamp(24px,3vw,32px)] font-[740] leading-[1.05] tracking-[-0.055em] text-[var(--ink)] outline-0 transition-[border-color] duration-[160ms] ease-in-out hover:border-b-[var(--accent)] focus:border-b-[var(--accent)]"
                  value={title}
                  onChange={(event) => updateTitle(event.target.value)}
                />
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2.5 text-[10px] text-[var(--muted-soft)]">
                <span className="font-[650] text-[var(--accent-deep)]">{sourceLabel}</span>
                <span className="size-[3px] rounded-full bg-[var(--line-strong)]" />
                {abc.match(/^C:\s*(.*)$/m)?.[1]?.trim() && (
                  <>
                    <span>{abc.match(/^C:\s*(.*)$/m)?.[1]?.trim()}</span>
                    <span className="size-[3px] rounded-full bg-[var(--line-strong)]" />
                  </>
                )}
                {abc.match(/^R:\s*(.*)$/m)?.[1]?.trim() && (
                  <>
                    <span>{abc.match(/^R:\s*(.*)$/m)?.[1]?.trim()}</span>
                    <span className="size-[3px] rounded-full bg-[var(--line-strong)]" />
                  </>
                )}
                <span>{keyLabel}</span>
                <span className="size-[3px] rounded-full bg-[var(--line-strong)]" />
                <span>{meterLabel}</span>
                <span className="size-[3px] rounded-full bg-[var(--line-strong)]" />
                <span>{tempoLabel ? `${tempoLabel} BPM` : "Tempo not set"}</span>
              </div>
              {feedback && (
                <p className="mt-2.5 mb-0 text-[11px] text-[var(--muted)]" role="status">
                  {feedback}
                </p>
              )}
            </div>
            <fieldset
              aria-label="Display controls"
              className="flex flex-wrap items-center justify-end gap-2 border-0 p-0 max-[720px]:justify-start"
            >
              <legend className="sr-only">Display controls</legend>
              <label className="flex items-center gap-1.5 text-[10px] font-[650] text-[var(--muted)]">
                Transpose
                <select
                  aria-label="Chart transposition"
                  className="rounded-[6px] border border-[var(--line-strong)] bg-[var(--paper)] px-1.5 py-1 text-[10px] text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  value={displaySettings.transposition}
                  onChange={(event) => updateDisplaySettings({ transposition: Number(event.target.value) })}
                >
                  {Array.from({ length: 25 }, (_, index) => index - 12).map((steps) => (
                    <option key={steps} value={steps}>
                      {steps > 0 ? `+${steps}` : steps}
                    </option>
                  ))}
                </select>
              </label>
              {([
                ["showChords", "Show chords"],
                ["showLyrics", "Show lyrics"],
              ] as const).map(([setting, label]) => (
                <label className="inline-flex items-center gap-1 text-[10px] font-[650] text-[var(--muted)]" key={setting}>
                  <input
                    aria-label={label}
                    checked={displaySettings[setting]}
                    className="size-3 accent-[var(--accent)]"
                    type="checkbox"
                    onChange={(event) => updateDisplaySettings({ [setting]: event.target.checked })}
                  />
                  {label.replace("Show ", "")}
                </label>
              ))}
            </fieldset>
            <div className="flex flex-wrap items-center justify-end gap-[7px] max-[720px]:mt-4 max-[720px]:[justify-content:stretch]">
              <button
                className="inline-flex min-h-[34px] cursor-pointer items-center justify-center gap-[7px] rounded-[8px] border border-[var(--line-strong)] bg-[var(--paper)] px-[11px] text-[11px] font-[650] text-[var(--muted)] transition-[border-color,color,opacity] duration-[160ms] ease-in-out hover:border-[var(--accent)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-[0.55] max-[720px]:flex-1"
                type="button"
                onClick={handleNewScore}
              >
                <Plus size={13} strokeWidth={2} />
                New
              </button>
              <button
                className="inline-flex min-h-[34px] cursor-pointer items-center justify-center gap-[7px] rounded-[8px] border border-[var(--line-strong)] bg-[var(--paper)] px-[11px] text-[11px] font-[650] text-[var(--muted)] transition-[border-color,color,opacity] duration-[160ms] ease-in-out hover:border-[var(--accent)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-[0.55] max-[720px]:flex-1"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={13} strokeWidth={1.8} />
                Import
              </button>
              <button
                className="inline-flex min-h-[34px] cursor-pointer items-center justify-center gap-[7px] rounded-[8px] border border-[var(--accent)] bg-[var(--accent)] px-[11px] text-[11px] font-[650] text-white transition-[border-color,background-color,opacity] duration-[160ms] ease-in-out hover:border-[var(--accent-deep)] hover:bg-[var(--accent-deep)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-[0.55] max-[720px]:flex-1"
                disabled={exporting}
                type="button"
                onClick={handleExport}
              >
                <Download size={13} strokeWidth={1.8} />
                {exporting ? "Converting…" : "Export MusicXML"}
              </button>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-[minmax(0,1.04fr)_minmax(360px,0.96fr)] gap-4 max-[1080px]:grid-cols-[minmax(0,1fr)]">
            <section
              className="flex min-h-[620px] min-w-0 flex-col overflow-hidden rounded-[11px] border border-[var(--line)] bg-[var(--paper)] max-[1080px]:min-h-auto"
              aria-label="ABC editor"
            >
              <div className="flex min-h-12 items-center justify-between gap-3 border-b border-[var(--line)] px-3.5 max-[720px]:px-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-[12px] font-[700] text-[var(--ink)]">
                    <FileMusic className="text-[var(--accent)]" size={15} strokeWidth={1.8} />
                    ABC source
                  </div>
                  <span className="rounded-[4px] bg-[var(--paper-soft)] px-1.5 py-1 font-mono text-[9px] font-[600] tracking-[0.03em] text-[var(--muted-soft)]">
                    .abc
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="inline-flex min-h-[34px] cursor-pointer items-center justify-center gap-[7px] rounded-[8px] border border-transparent bg-transparent px-[11px] text-[11px] font-[650] text-[var(--muted)] transition-[background-color,color,opacity] duration-[160ms] ease-in-out hover:bg-[var(--paper-soft)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-[0.55]"
                    type="button"
                    onClick={handleFormat}
                  >
                    <Settings2 size={13} strokeWidth={1.8} />
                    Format
                  </button>
                  <button
                    className="inline-flex min-h-[34px] cursor-pointer items-center justify-center gap-[7px] rounded-[8px] border border-transparent bg-transparent px-[11px] text-[11px] font-[650] text-[var(--muted)] transition-[background-color,color,opacity] duration-[160ms] ease-in-out hover:bg-[var(--paper-soft)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-[0.55]"
                    type="button"
                    onClick={handleCopy}
                  >
                    {copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.8} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="m-3.5 grid min-h-[515px] flex-1 grid-cols-[40px_minmax(0,1fr)] overflow-hidden rounded-[8px] border border-[var(--line)] bg-[var(--paper-soft)] max-[720px]:m-3">
                <div
                  className="overflow-hidden border-r border-[var(--line)] bg-[var(--editor-gutter)] pb-[17px] pl-0 pr-[9px] pt-3.5 text-right font-mono text-[11px] leading-[1.8] text-[var(--muted-soft)] select-none"
                  aria-hidden="true"
                >
                  {Array.from({ length: lineCount }, (_, index) => (
                    <span className="block h-[19.8px]" key={index}>
                      {index + 1}
                    </span>
                  ))}
                </div>
                <textarea
                  aria-label="ABC notation source"
                  className="min-h-[510px] w-full resize-none whitespace-pre border-0 bg-transparent px-4 pb-[17px] pt-3.5 font-mono text-[11.5px] leading-[1.8] text-[var(--ink)] outline-0 [tab-size:2] selection:bg-[#ddd9ff] dark:selection:bg-[#4a4387] dark:selection:text-white"
                  spellCheck={false}
                  value={abc}
                  onChange={(event) => handleAbcChange(event.target.value)}
                />
              </div>

              <div className="flex min-h-[46px] items-center justify-between gap-3 px-3.5 max-[720px]:items-start max-[720px]:flex-col max-[720px]:justify-center max-[720px]:gap-1.5 max-[720px]:px-3 max-[720px]:py-[9px]">
                <div className="flex flex-wrap items-center gap-3 font-mono text-[9px] text-[var(--muted-soft)]">
                  <span>{sourceLength} chars</span>
                  <span>{lineCount} lines</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 font-mono text-[9px] text-[var(--muted-soft)]">
                  <span className={`flex items-center gap-1.5 ${conversion ? "text-[var(--green)]" : "text-[var(--amber)]"}`}>
                    <span
                      className={`size-1.5 shrink-0 rounded-full ${conversion ? "bg-[var(--green)]" : "bg-[var(--amber)]"}`}
                    />
                    {conversion ? "Ready to export" : "Check source"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-[5px] shrink-0 rounded-full bg-[var(--green)]" />
                    {saveStatus}
                  </span>
                </div>
              </div>
            </section>

            <section
              className="flex min-h-[620px] min-w-0 flex-col overflow-hidden rounded-[11px] border border-[var(--line)] bg-[var(--paper)] max-[1080px]:min-h-auto"
              aria-label="Lead sheet preview"
            >
              <div className="flex min-h-12 items-center justify-between gap-3 border-b border-[var(--line)] px-3.5 max-[720px]:px-3">
                <div className="flex items-center gap-2 text-[12px] font-[700] text-[var(--ink)]">
                  <Music2 className="text-[var(--accent)]" size={15} strokeWidth={1.8} />
                  Preview
                </div>
              </div>
              <div className="flex min-h-[570px] flex-1 flex-col p-3.5 max-[1080px]:min-h-[520px] max-[720px]:min-h-[440px] max-[720px]:p-3">
                <AbcPreview
                  abc={abc}
                  key={abc}
                  showChords={displaySettings.showChords}
                  showLyrics={displaySettings.showLyrics}
                  transposition={displaySettings.transposition}
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
            </section>
          </div>

          <input ref={fileInputRef} accept=".abc,.txt" hidden type="file" onChange={handleFileImport} />
        </main>
      </div>
    </div>
  );
}
