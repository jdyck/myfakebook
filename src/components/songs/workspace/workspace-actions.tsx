"use client";

import { useRef, type ChangeEventHandler } from "react";
import { Menu } from "@base-ui/react/menu";
import { ChevronDown, Download, Plus, Upload } from "lucide-react";
import componentStyles from "./workspace-actions.module.css";

type WorkspaceActionsProps = {
  exporting: boolean;
  onNew: () => void;
  onExport: () => void;
  onExportSvg: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
  onFileImport: ChangeEventHandler<HTMLInputElement>;
};

export function WorkspaceActions({ exporting, onNew, onExport, onExportSvg, onExportPng, onExportPdf, onFileImport }: WorkspaceActionsProps) {
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
      <Menu.Root>
        <Menu.Trigger className={componentStyles.exportButton} disabled={exporting}>
          <Download size={13} strokeWidth={1.8} />
          Export
          <ChevronDown size={13} strokeWidth={2} />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="end" sideOffset={6}>
            <Menu.Popup className={componentStyles.exportMenuPopup}>
              <Menu.Item className={componentStyles.exportMenuItem} disabled={exporting} onClick={onExport}>
                MusicXML
              </Menu.Item>
              <Menu.Item className={componentStyles.exportMenuItem} disabled={exporting} onClick={onExportSvg}>
                SVG
              </Menu.Item>
              <Menu.Item className={componentStyles.exportMenuItem} disabled={exporting} onClick={onExportPng}>
                PNG
              </Menu.Item>
              <Menu.Item className={componentStyles.exportMenuItem} disabled={exporting} onClick={onExportPdf}>
                PDF
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
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
