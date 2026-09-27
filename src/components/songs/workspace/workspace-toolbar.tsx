"use client";

import type { ChangeEventHandler } from "react";

import { DisplayControls } from "@/components/songs/workspace/display-controls";
import { WorkspaceActions } from "@/components/songs/workspace/workspace-actions";
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
    <div className={componentStyles.workspaceToolbar}>
      <div className={componentStyles.songMetadataBlock}>
        <h1 className={componentStyles.songTitleHeading}>
          <input
            aria-label="Lead sheet title"
            className={componentStyles.songTitleInput}
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
          />
        </h1>
        <div className={componentStyles.songMetadataList}>
          <span className={componentStyles.songSourceBadge}>{sourceLabel}</span>
          <span className={componentStyles.metadataSeparator} />
          {composerLabel && (
            <>
              <span>{composerLabel}</span>
              <span className={componentStyles.metadataSeparator} />
            </>
          )}
          {rhythmLabel && (
            <>
              <span>{rhythmLabel}</span>
              <span className={componentStyles.metadataSeparator} />
            </>
          )}
          <span>{keyLabel}</span>
          <span className={componentStyles.metadataSeparator} />
          <span>{meterLabel}</span>
          <span className={componentStyles.metadataSeparator} />
          <span>{tempoLabel ? `${tempoLabel} BPM` : "Tempo not set"}</span>
        </div>
        {feedback && (
          <p className={componentStyles.feedbackStatus} role="status">
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
