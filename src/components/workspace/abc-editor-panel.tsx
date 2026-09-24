"use client";

import { Check, Copy, FileMusic, Settings2 } from "lucide-react";

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
  return (
    <section
      className="flex-1 flex-col overflow-hidden rounded-[11px] border border-(--line) bg-(--paper)"
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
            onClick={onFormat}
          >
            <Settings2 size={13} strokeWidth={1.8} />
            Format
          </button>
          <button
            className="inline-flex min-h-[34px] cursor-pointer items-center justify-center gap-[7px] rounded-[8px] border border-transparent bg-transparent px-[11px] text-[11px] font-[650] text-[var(--muted)] transition-[background-color,color,opacity] duration-[160ms] ease-in-out hover:bg-[var(--paper-soft)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-[0.55]"
            type="button"
            onClick={onCopy}
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
          onChange={(event) => onChange(event.target.value)}
        />
      </div>

      <div className="flex min-h-[46px] items-center justify-between gap-3 px-3.5 max-[720px]:items-start max-[720px]:flex-col max-[720px]:justify-center max-[720px]:gap-1.5 max-[720px]:px-3 max-[720px]:py-[9px]">
        <div className="flex flex-wrap items-center gap-3 font-mono text-[9px] text-[var(--muted-soft)]">
          <span>{sourceLength} chars</span>
          <span>{lineCount} lines</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono text-[9px] text-[var(--muted-soft)]">
          <span className={`flex items-center gap-1.5 ${isConvertible ? "text-[var(--green)]" : "text-[var(--amber)]"}`}>
            <span
              className={`size-1.5 shrink-0 rounded-full ${isConvertible ? "bg-[var(--green)]" : "bg-[var(--amber)]"}`}
            />
            {isConvertible ? "Ready to export" : "Check source"}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-[5px] shrink-0 rounded-full bg-[var(--green)]" />
            {saveStatus}
          </span>
        </div>
      </div>
    </section>
  );
}
