"use client";

import { Check, Copy, FileMusic, Settings2 } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { AbcRowEditor } from "@/components/workspace/abc-row-editor";
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
      className={componentStyles.style0}
      role="tabpanel"
      id="abc-source-panel"
      aria-labelledby="abc-source-tab"
    >
      <div
        className={componentStyles.style1}
        ref={lineNumbersRef}
        aria-hidden="true"
      >
        {Array.from({ length: lineCount }, (_, index) => (
          <span className={componentStyles.style2} key={index}>
            {index + 1}
          </span>
        ))}
      </div>
      <textarea
        aria-label="ABC notation source"
        className={componentStyles.style3}
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
      className={componentStyles.style4}
      aria-label="ABC editor"
    >
      <div className={componentStyles.style5}>
        <div className={componentStyles.style6}>
          <FileMusic className={componentStyles.style7} size={15} strokeWidth={1.8} />
          <div className={componentStyles.style8} role="tablist" aria-label="ABC editor mode">
            <button
              aria-label="ABC source"
              aria-controls="abc-source-panel"
              aria-selected={activeTab === "source"}
              className={`${componentStyles.style9} ${activeTab === "source" ? componentStyles.style10 : componentStyles.style11}`}
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
              className={`${componentStyles.style9} ${activeTab === "easy" ? componentStyles.style10 : componentStyles.style11}`}
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
          <span className={componentStyles.style12}>
            .abc
          </span>
        </div>
        <div className={componentStyles.style13}>
          <button
            className={componentStyles.style14}
            type="button"
            onClick={onFormat}
          >
            <Settings2 size={13} strokeWidth={1.8} />
            Format
          </button>
          <button
            className={componentStyles.style14}
            type="button"
            onClick={onCopy}
          >
            {copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.8} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div className={componentStyles.style15}>
        <div className={activeTab === "source" ? componentStyles.style15 : componentStyles.style16}>
          <EditorSurface abc={abc} lineCount={lineCount} onChange={onChange} />
        </div>
        <div className={activeTab === "easy" ? componentStyles.style15 : componentStyles.style16}>
          <AbcRowEditor abc={abc} onChange={onChange} />
        </div>
      </div>

      <div className={componentStyles.style17}>
        <div className={componentStyles.style18}>
          <span>{sourceLength} chars</span>
          <span>{lineCount} lines</span>
        </div>
        <div className={componentStyles.style18}>
          <span className={`${componentStyles.style19} ${isConvertible ? componentStyles.style20 : componentStyles.style21}`}>
            <span
              className={`${componentStyles.style22} ${isConvertible ? componentStyles.style23 : componentStyles.style24}`}
            />
            {isConvertible ? "Ready to export" : "Check source"}
          </span>
          <span className={componentStyles.style19}>
            <span className={componentStyles.style25} />
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
