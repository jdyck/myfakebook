"use client";

import type { ChangeEventHandler } from "react";

import { DisplayControls } from "@/components/workspace/display-controls";
import { WorkspaceActions } from "@/components/workspace/workspace-actions";
import type { SongDisplaySettings } from "@/lib/abc-display";
import componentStyles from "./workspace-toolbar.module.css";

type WorkspaceToolbarProps = {
  abc: string;
  title: string;
  sourceLabel: string;
  feedback: string | null;
  displaySettings: SongDisplaySettings;
  exporting: boolean;
  onTitleChange: (value: string) => void;
  onDisplaySettingsChange: (patch: Partial<SongDisplaySettings>) => void;
  onNew: () => void;
  onExport: () => void;
  onFileImport: ChangeEventHandler<HTMLInputElement>;
};

export function WorkspaceToolbar({
  abc,
  title,
  sourceLabel,
  feedback,
  displaySettings,
  exporting,
  onTitleChange,
  onDisplaySettingsChange,
  onNew,
  onExport,
  onFileImport,
}: WorkspaceToolbarProps) {
  const composerLabel = abc.match(/^C:\s*(.*)$/m)?.[1]?.trim();
  const rhythmLabel = abc.match(/^R:\s*(.*)$/m)?.[1]?.trim();
  const keyLabel = abc.match(/^K:\s*(.*)$/m)?.[1]?.trim() || "C";
  const meterLabel = abc.match(/^M:\s*(.*)$/m)?.[1]?.trim() || "4/4";
  const tempoLabel = abc.match(/^Q:.*?=\s*(\d+)/m)?.[1] || abc.match(/^Q:\s*(\d+)/m)?.[1] || "";

  return (
    <div className={componentStyles.style0}>
      <div className={componentStyles.style1}>
        <h1 className={componentStyles.style2}>
          <input
            aria-label="Lead sheet title"
            className={componentStyles.style3}
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
          />
        </h1>
        <div className={componentStyles.style4}>
          <span className={componentStyles.style5}>{sourceLabel}</span>
          <span className={componentStyles.style6} />
          {composerLabel && (
            <>
              <span>{composerLabel}</span>
              <span className={componentStyles.style6} />
            </>
          )}
          {rhythmLabel && (
            <>
              <span>{rhythmLabel}</span>
              <span className={componentStyles.style6} />
            </>
          )}
          <span>{keyLabel}</span>
          <span className={componentStyles.style6} />
          <span>{meterLabel}</span>
          <span className={componentStyles.style6} />
          <span>{tempoLabel ? `${tempoLabel} BPM` : "Tempo not set"}</span>
        </div>
        {feedback && (
          <p className={componentStyles.style7} role="status">
            {feedback}
          </p>
        )}
      </div>
      <DisplayControls settings={displaySettings} onChange={onDisplaySettingsChange} />
      <WorkspaceActions
        exporting={exporting}
        onExport={onExport}
        onFileImport={onFileImport}
        onNew={onNew}
      />
    </div>
  );
}
