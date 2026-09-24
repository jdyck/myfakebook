"use client";

import { useRef, type ChangeEventHandler } from "react";
import { Download, Plus, Upload } from "lucide-react";

type WorkspaceActionsProps = {
  exporting: boolean;
  onNew: () => void;
  onExport: () => void;
  onFileImport: ChangeEventHandler<HTMLInputElement>;
};

export function WorkspaceActions({ exporting, onNew, onExport, onFileImport }: WorkspaceActionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center justify-end gap-[7px] max-[720px]:mt-4 max-[720px]:[justify-content:stretch]">
      <button
        className="inline-flex min-h-[34px] cursor-pointer items-center justify-center gap-[7px] rounded-[8px] border border-[var(--line-strong)] bg-[var(--paper)] px-[11px] text-[11px] font-[650] text-[var(--muted)] transition-[border-color,color,opacity] duration-[160ms] ease-in-out hover:border-[var(--accent)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-[0.55] max-[720px]:flex-1"
        type="button"
        onClick={onNew}
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
        onClick={onExport}
      >
        <Download size={13} strokeWidth={1.8} />
        {exporting ? "Converting…" : "Export MusicXML"}
      </button>
      <input
        ref={fileInputRef}
        accept=".abc,.txt"
        hidden
        type="file"
        onChange={onFileImport}
      />
    </div>
  );
}
