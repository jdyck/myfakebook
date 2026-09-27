"use client";

import { useRef, type ChangeEventHandler } from "react";
import { Download, Plus, Upload } from "lucide-react";
import componentStyles from "./workspace-actions.module.css";

type WorkspaceActionsProps = {
  exporting: boolean;
  onNew: () => void;
  onExport: () => void;
  onFileImport: ChangeEventHandler<HTMLInputElement>;
};

export function WorkspaceActions({ exporting, onNew, onExport, onFileImport }: WorkspaceActionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={componentStyles.workspaceActionGroup}>
      <button
        className={componentStyles.secondaryActionButton}
        type="button"
        onClick={onNew}
      >
        <Plus size={13} strokeWidth={2} />
        New
      </button>
      <button
        className={componentStyles.secondaryActionButton}
        type="button"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={13} strokeWidth={1.8} />
        Import
      </button>
      <button
        className={componentStyles.exportButton}
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
