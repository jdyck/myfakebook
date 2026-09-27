"use client";

import { Check, Copy, FileMusic, Settings2 } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { AbcRowEditor } from "@/components/songs/editor/abc-row-editor";
import componentStyles from "./abc-editor-panel.module.css";

type EditorSurfaceProps = {
  abc: string;
  lineCount: number;
  onChange: (value: string) => void;
};

function EditorSurface({ abc, lineCount, onChange }: EditorSurfaceProps) {
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={componentStyles.sourceEditorPanel}
      role="tabpanel"
      id="abc-source-panel"
      aria-labelledby="abc-source-tab"
    >
      <div
        className={componentStyles.lineNumberGutter}
        ref={lineNumbersRef}
        aria-hidden="true"
      >
        {Array.from({ length: lineCount }, (_, index) => (
          <span className={componentStyles.lineNumber} key={index}>
            {index + 1}
          </span>
        ))}
      </div>
      <textarea
        aria-label="ABC notation source"
        className={componentStyles.sourceTextarea}
        spellCheck={false}
        value={abc}
        onChange={(event) => onChange(event.target.value)}
        onScroll={(event) => {
          if (lineNumbersRef.current) {
            lineNumbersRef.current.scrollTop = event.currentTarget.scrollTop;
          }
        }}
      />
    </div>
  );
}

type AbcEditorPanelProps = {
  abc: string;
  lineCount: number;
  sourceLength: number;
  isConvertible: boolean;
  saveStatus: string;
  copied: boolean;
  onChange: (value: string) => void;
  onFormat: () => void;
  onCopy: () => void;
};

export function AbcEditorPanel({
  abc,
  lineCount,
  sourceLength,
  isConvertible,
  saveStatus,
  copied,
  onChange,
  onFormat,
  onCopy,
}: AbcEditorPanelProps) {
  const [activeTab, setActiveTab] = useState<"source" | "easy">("source");

  return (
    <section
      className={componentStyles.abcEditorPanel}
      aria-label="ABC editor"
    >
      <div className={componentStyles.editorToolbar}>
        <div className={componentStyles.editorModeControls}>
          <FileMusic className={componentStyles.fileTypeIcon} size={15} strokeWidth={1.8} />
          <div className={componentStyles.editorModeTabs} role="tablist" aria-label="ABC editor mode">
            <button
              aria-label="ABC source"
              aria-controls="abc-source-panel"
              aria-selected={activeTab === "source"}
              className={`${componentStyles.editorModeTab} ${activeTab === "source" ? componentStyles.activeEditorModeTab : componentStyles.inactiveEditorModeTab}`}
              id="abc-source-tab"
              role="tab"
              tabIndex={activeTab === "source" ? 0 : -1}
              type="button"
              onClick={() => setActiveTab("source")}
              onKeyDown={(event) => handleTabKeyDown(event, setActiveTab)}
            >
              Source
            </button>
            <button
              aria-label="Easy editor"
              aria-controls="abc-easy-panel"
              aria-selected={activeTab === "easy"}
              className={`${componentStyles.editorModeTab} ${activeTab === "easy" ? componentStyles.activeEditorModeTab : componentStyles.inactiveEditorModeTab}`}
              id="abc-easy-tab"
              role="tab"
              tabIndex={activeTab === "easy" ? 0 : -1}
              type="button"
              onClick={() => setActiveTab("easy")}
              onKeyDown={(event) => handleTabKeyDown(event, setActiveTab)}
            >
              Easy
            </button>
          </div>
          <span className={componentStyles.fileTypeBadge}>
            .abc
          </span>
        </div>
        <div className={componentStyles.editorActions}>
          <button
            className={componentStyles.editorActionButton}
            type="button"
            onClick={onFormat}
          >
            <Settings2 size={13} strokeWidth={1.8} />
            Format
          </button>
          <button
            className={componentStyles.editorActionButton}
            type="button"
            onClick={onCopy}
          >
            {copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.8} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div className={componentStyles.editorPane}>
        <div className={activeTab === "source" ? componentStyles.editorPane : componentStyles.hiddenEditorPane}>
          <EditorSurface abc={abc} lineCount={lineCount} onChange={onChange} />
        </div>
        <div className={activeTab === "easy" ? componentStyles.editorPane : componentStyles.hiddenEditorPane}>
          <AbcRowEditor abc={abc} onChange={onChange} />
        </div>
      </div>

      <div className={componentStyles.editorStatusBar}>
        <div className={componentStyles.statusGroup}>
          <span>{sourceLength} chars</span>
          <span>{lineCount} lines</span>
        </div>
        <div className={componentStyles.statusGroup}>
          <span className={`${componentStyles.statusLabel} ${isConvertible ? componentStyles.conversionReadyStatus : componentStyles.conversionWarningStatus}`}>
            <span
              className={`${componentStyles.statusDot} ${isConvertible ? componentStyles.readyStatusDot : componentStyles.warningStatusDot}`}
            />
            {isConvertible ? "Ready to export" : "Check source"}
          </span>
          <span className={componentStyles.statusLabel}>
            <span className={componentStyles.saveStatusDot} />
            {saveStatus}
          </span>
        </div>
      </div>
    </section>
  );
}

function handleTabKeyDown(
  event: KeyboardEvent<HTMLButtonElement>,
  setActiveTab: (tab: "source" | "easy") => void,
) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;

  event.preventDefault();
  const tabs = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
  if (!tabs.length) return;

  const currentIndex = tabs.indexOf(event.currentTarget);
  const nextIndex = event.key === "Home"
    ? 0
    : event.key === "End"
      ? tabs.length - 1
      : (currentIndex + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
  tabs[nextIndex]?.focus();
  setActiveTab(nextIndex === 0 ? "source" : "easy");
}
