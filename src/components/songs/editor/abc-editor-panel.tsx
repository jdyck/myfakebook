"use client";

import { Check, Copy, FileMusic, Settings2 } from "lucide-react";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { toInlineAbc, toSeparateAbc } from "@/lib/notation/abc-voices";
import { validateSongContent, type SongContent } from "@/lib/songs/song-content";
import { resolveSongSource } from "@/lib/songs/song-source";
import { AbcRowEditor } from "./abc-row-editor";
import componentStyles from "./abc-editor-panel.module.css";

const TABS = [
  { id: "inline", label: "Inline chords", sourceLabel: "Inline ABC source" },
  { id: "easy", label: "Easy", sourceLabel: "Easy chord, melody, and lyric editor" },
  { id: "parts", label: "Separate parts", sourceLabel: "Separate parts ABC source" },
  { id: "json", label: "JSON", sourceLabel: "Song content JSON" },
] as const;
type EditorTab = typeof TABS[number]["id"];
type Draft = { abc: string; value: string; error: string };

function EditorSurface({ value, tab, onChange }: {
  value: string;
  tab: typeof TABS[number];
  onChange: (value: string) => void;
}) {
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  return (
    <div className={componentStyles.sourceEditorPanel} role="tabpanel" id={`abc-${tab.id}-panel`} aria-labelledby={`abc-${tab.id}-tab`}>
      <div className={componentStyles.lineNumberGutter} ref={lineNumbersRef} aria-hidden="true">
        {Array.from({ length: value.split("\n").length }, (_, index) => (
          <span className={componentStyles.lineNumber} key={index}>{index + 1}</span>
        ))}
      </div>
      <textarea
        aria-label={tab.sourceLabel}
        className={componentStyles.sourceTextarea}
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onScroll={(event) => {
          if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = event.currentTarget.scrollTop;
        }}
      />
    </div>
  );
}

type AbcEditorPanelProps = {
  abc: string;
  abcParts: string;
  content: SongContent;
  onContentChange: (content: SongContent) => void;
  lineCount: number;
  copied: boolean;
  onChange: (value: string, abcParts?: string) => void;
  onFormat: () => void;
  onCopy: (value?: string) => void;
};

function generate(value: () => string) {
  try {
    return { value: value(), error: "" };
  } catch (error) {
    return { value: "", error: error instanceof Error ? error.message : "Couldn’t convert this song." };
  }
}

export function AbcEditorPanel({ abc, abcParts, content, copied, onChange, onContentChange, onFormat, onCopy }: AbcEditorPanelProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>("inline");
  const [partsDraft, setPartsDraft] = useState<Draft | null>(null);
  const [jsonDraft, setJsonDraft] = useState<Draft | null>(null);
  const generatedParts = useMemo(() => generate(() => abcParts || toSeparateAbc(abc)), [abc, abcParts]);
  const generatedJson = useMemo(() => generate(() => JSON.stringify(content, null, 2)), [content]);
  const parts = partsDraft?.abc === abc ? partsDraft : generatedParts;
  const json = jsonDraft?.abc === abc ? jsonDraft : generatedJson;
  const current = activeTab === "parts" ? parts : activeTab === "json" ? json : { value: abc, error: "" };
  const tab = TABS.find((tab) => tab.id === activeTab)!;

  function handleChange(value: string) {
    if (activeTab === "inline" || activeTab === "easy") {
      onChange(value);
      return;
    }
    const setDraft = activeTab === "parts" ? setPartsDraft : setJsonDraft;
    try {
      let inline: string;
      if (activeTab === "parts") {
        if (!/^V:[ \t]*chords\b/m.test(value) || !/^V:[ \t]*melody\b/m.test(value)) throw new Error("Include both V:chords and V:melody.");
        inline = toInlineAbc(value);
      }
      else {
        const nextContent: unknown = JSON.parse(value);
        validateSongContent(nextContent);
        inline = resolveSongSource({ content: nextContent, title: abc.match(/^T:[ \t]*(.*)$/m)?.[1] ?? "Untitled" }, abc).abc;
        setDraft({ abc: inline, value, error: "" });
        onContentChange(nextContent);
        return;
      }
      setDraft({ abc: inline, value, error: "" });
      onChange(inline, value);
    } catch (error) {
      // Keep incomplete edits visible while preview and persistence use the last valid song.
      setDraft({ abc, value, error: error instanceof Error ? error.message : "Check the song format." });
    }
  }

  function handleFormat() {
    if (activeTab === "inline" || activeTab === "easy") return onFormat();
    if (activeTab === "json") {
      try {
        handleChange(JSON.stringify(JSON.parse(current.value), null, 2));
      } catch {
        handleChange(current.value);
      }
    } else handleChange(current.value.replaceAll("\r", "").split("\n").map((line) => line.trimEnd()).join("\n"));
  }

  return (
    <section className={componentStyles.abcEditorPanel} aria-label="ABC editor">
      <div className={componentStyles.editorToolbar}>
        <div className={componentStyles.editorModeControls}>
          <FileMusic className={componentStyles.fileTypeIcon} size={15} strokeWidth={1.8} />
          <div className={componentStyles.editorModeTabs} role="tablist" aria-label="Song editor format">
            {TABS.map((item) => (
              <button
                aria-controls={`abc-${item.id}-panel`}
                aria-selected={activeTab === item.id}
                className={`${componentStyles.editorModeTab} ${activeTab === item.id ? componentStyles.activeEditorModeTab : componentStyles.inactiveEditorModeTab}`}
                id={`abc-${item.id}-tab`}
                key={item.id}
                role="tab"
                tabIndex={activeTab === item.id ? 0 : -1}
                type="button"
                onClick={() => setActiveTab(item.id)}
                onKeyDown={(event) => handleTabKeyDown(event, setActiveTab)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <span className={componentStyles.fileTypeBadge}>{activeTab === "json" ? ".json" : ".abc"}</span>
        </div>
        <div className={componentStyles.editorActions}>
          <button className={componentStyles.editorActionButton} type="button" onClick={handleFormat}>
            <Settings2 size={13} strokeWidth={1.8} />Format
          </button>
          <button className={componentStyles.editorActionButton} type="button" onClick={() => onCopy(current.value)}>
            {copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.8} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <p className={componentStyles.editorHint}>
        {activeTab === "easy" ? "Edit chords, melody, and lyrics in aligned rows. Changes update the song object and preview." : activeTab === "inline" ? "Inline chords feed the preview." : activeTab === "parts" ? "Edit V:chords and V:melody. Valid changes update inline ABC and the preview." : "Edit the song object. Valid changes update both ABC tabs and the preview."}
      </p>
      {current.error && <p className={componentStyles.editorError} role="alert">{current.error} The preview keeps the last valid song.</p>}
      <div className={componentStyles.editorPane}>
        {activeTab !== "easy" && <EditorSurface key={activeTab} value={current.value} tab={tab} onChange={handleChange} />}
        <div className={activeTab === "easy" ? componentStyles.editorPane : componentStyles.hiddenEditorPane}>
          <AbcRowEditor abc={abc} onChange={onChange} />
        </div>
      </div>
    </section>
  );
}

function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, setActiveTab: (tab: EditorTab) => void) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const tabs = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
  const currentIndex = tabs.indexOf(event.currentTarget);
  const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? TABS.length - 1 : (currentIndex + (event.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length;
  tabs[nextIndex]?.focus();
  setActiveTab(TABS[nextIndex].id);
}
