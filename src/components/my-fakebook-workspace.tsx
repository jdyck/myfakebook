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
import { ScorePersistence } from "@/components/score-persistence";
import { ThemeToggle } from "@/components/theme-toggle";
import { abcToMusicXml, DEFAULT_ABC, type MusicXmlResult } from "@/lib/abc";

type MyFakebookWorkspaceProps = {
  clerkConfigured: boolean;
  persistenceEnabled: boolean;
};

export function MyFakebookWorkspace({
  clerkConfigured,
  persistenceEnabled,
}: MyFakebookWorkspaceProps) {
  const [abc, setAbc] = useState(DEFAULT_ABC);
  const [title, setTitle] = useState("Midnight Walk");
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState(persistenceEnabled ? "Connecting…" : "Saved locally");
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
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
  const tempoLabel = abc.match(/^Q:.*?=\s*(\d+)/m)?.[1] || abc.match(/^Q:\s*(\d+)/m)?.[1] || "104";

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const stored =
          window.localStorage.getItem("myfakebook:draft") ?? window.localStorage.getItem("notate:draft");
        if (stored) {
          const draft = JSON.parse(stored) as { title?: string; abc?: string };
          if (typeof draft.abc === "string" && draft.abc.trim()) setAbc(draft.abc);
          if (typeof draft.title === "string" && draft.title.trim()) setTitle(draft.title);
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
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem("myfakebook:draft", JSON.stringify({ title, abc }));
      if (!persistenceEnabled) setSaveStatus("Saved locally");
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [abc, hydrated, persistenceEnabled, title]);

  const handleStatus = useCallback((status: string) => setSaveStatus(status), []);

  function updateTitle(value: string) {
    setTitle(value);
    setAbc((current) => {
      if (/^T:.*$/m.test(current)) return current.replace(/^T:.*$/m, `T:${value}`);
      return `T:${value}\n${current}`;
    });
  }

  function handleNewScore() {
    setTitle("Midnight Walk");
    setAbc(DEFAULT_ABC);
    setFeedback("Fresh lead sheet ready");
  }

  function handleFormat() {
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
      setAbc(nextAbc);
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
        body: JSON.stringify({ abc }),
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
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <Music2 size={17} strokeWidth={2.2} />
          </div>
          <span className="brand-name">MyFakebook</span>
        </div>
        <div className="topbar-actions">
          <ThemeToggle />
          <AuthControls configured={clerkConfigured} />
        </div>
      </header>

      <div className={`shell-grid ${persistenceEnabled ? "has-sidebar" : ""}`}>
        {persistenceEnabled && (
          <aside className="sidebar" aria-label="Saved charts">
            <div className="sidebar-header">
              <span className="sidebar-title">Saved charts</span>
            </div>
            <ScorePersistence
              abc={abc}
              enabled={persistenceEnabled}
              onLoad={(score) => {
                setTitle(score.title);
                setAbc(score.abc);
                setFeedback(`Loaded ${score.title}`);
              }}
              onStatus={handleStatus}
              title={scoreTitle}
            />
          </aside>
        )}

        <main className="workspace">
          <div className="workspace-heading">
            <div className="heading-copy">
              <h1 className="workspace-title">
                <input
                  aria-label="Lead sheet title"
                  className="workspace-title-input"
                  value={title}
                  onChange={(event) => updateTitle(event.target.value)}
                />
              </h1>
              <div className="score-meta">
                <span>{keyLabel}</span>
                <span className="score-meta-divider" />
                <span>{meterLabel}</span>
                <span className="score-meta-divider" />
                <span>{tempoLabel} BPM</span>
              </div>
              {feedback && <p className="workspace-feedback" role="status">{feedback}</p>}
            </div>
            <div className="heading-actions">
              <button className="button-secondary" type="button" onClick={handleNewScore}>
                <Plus size={13} strokeWidth={2} />
                New
              </button>
              <button className="button-secondary" type="button" onClick={() => fileInputRef.current?.click()}>
                <Upload size={13} strokeWidth={1.8} />
                Import
              </button>
              <button className="button-primary" disabled={exporting} type="button" onClick={handleExport}>
                <Download size={13} strokeWidth={1.8} />
                {exporting ? "Converting…" : "Export MusicXML"}
              </button>
            </div>
          </div>

          <div className="workspace-grid">
            <section className="surface-card editor-card" aria-label="ABC editor">
              <div className="card-toolbar">
                <div className="card-toolbar-left">
                  <div className="card-label">
                    <FileMusic className="card-label-icon" size={15} strokeWidth={1.8} />
                    ABC source
                  </div>
                  <span className="format-pill">.abc</span>
                </div>
                <div className="card-toolbar-right">
                  <button className="button-ghost" type="button" onClick={handleFormat}>
                    <Settings2 size={13} strokeWidth={1.8} />
                    Format
                  </button>
                  <button className="button-ghost" type="button" onClick={handleCopy}>
                    {copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.8} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="editor-wrap">
                <div className="line-numbers" aria-hidden="true">
                  {Array.from({ length: lineCount }, (_, index) => <span key={index}>{index + 1}</span>)}
                </div>
                <textarea
                  aria-label="ABC notation source"
                  className="abc-editor"
                  spellCheck={false}
                  value={abc}
                  onChange={(event) => setAbc(event.target.value)}
                />
              </div>

              <div className="editor-foot">
                <div className="editor-foot-left">
                  <span>{sourceLength} chars</span>
                  <span>{lineCount} lines</span>
                </div>
                <div className="editor-foot-right">
                  <span className={`parse-state ${conversion ? "" : "error"}`}>
                    <span className="status-dot" />
                    {conversion ? "Ready to export" : "Check source"}
                  </span>
                  <span className="save-state"><span className="status-dot" />{saveStatus}</span>
                </div>
              </div>
            </section>

            <section className="surface-card preview-card" aria-label="Lead sheet preview">
              <div className="card-toolbar">
                <div className="card-label">
                  <Music2 className="card-label-icon" size={15} strokeWidth={1.8} />
                  Preview
                </div>
              </div>
              <div className="preview-body">
                <AbcPreview abc={abc} key={abc} />
              </div>
            </section>
          </div>

          <input ref={fileInputRef} accept=".abc,.txt" hidden type="file" onChange={handleFileImport} />
        </main>
      </div>
    </div>
  );
}
