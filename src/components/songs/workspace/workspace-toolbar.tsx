"use client";

import { WorkspaceActions } from "@/components/songs/workspace/workspace-actions";
import componentStyles from "./workspace-toolbar.module.css";

type WorkspaceToolbarProps = {
  exporting: boolean;
  onEdit: () => void;
  onExport: () => void;
  onExportAbc: () => void;
  onExportSvg: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
};

export function WorkspaceToolbar({
  exporting,
  onEdit,
  onExport,
  onExportAbc,
  onExportSvg,
  onExportPng,
  onExportPdf,
}: WorkspaceToolbarProps) {
  return (
    <div className={componentStyles.toolbar}>
      <WorkspaceActions
        exporting={exporting}
        onEdit={onEdit}
        onExport={onExport}
        onExportAbc={onExportAbc}
        onExportSvg={onExportSvg}
        onExportPng={onExportPng}
        onExportPdf={onExportPdf}
      />
    </div>
  );
}
