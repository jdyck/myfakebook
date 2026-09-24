"use client";

import type { ChangeEventHandler } from "react";

import { DisplayControls } from "@/components/workspace/display-controls";
import { WorkspaceActions } from "@/components/workspace/workspace-actions";
import type { SongDisplaySettings } from "@/lib/abc-display";

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
    <div className="mb-5 flex items-start justify-between gap-6 max-[720px]:block">
      <div className="min-w-0 flex-1">
        <h1 className="m-0">
          <input
            aria-label="Lead sheet title"
            className="block w-full max-w-130 border-0 border-b border-b-transparent bg-transparent text-[clamp(24px,3vw,32px)] font-[740] leading-[1.05] tracking-[-0.055em] text-foreground outline-0 transition-[border-color] duration-160 ease-in-out hover:border-b-(--accent)"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
          />
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2.5 text-[10px] text-(--muted-soft)">
          <span className="font-[650] text-(--accent-deep)">{sourceLabel}</span>
          <span className="size-0.75 rounded-full bg-(--line-strong)" />
          {composerLabel && (
            <>
              <span>{composerLabel}</span>
              <span className="size-0.75 rounded-full bg-(--line-strong)" />
            </>
          )}
          {rhythmLabel && (
            <>
              <span>{rhythmLabel}</span>
              <span className="size-0.75 rounded-full bg-(--line-strong)" />
            </>
          )}
          <span>{keyLabel}</span>
          <span className="size-0.75 rounded-full bg-(--line-strong)" />
          <span>{meterLabel}</span>
          <span className="size-0.75 rounded-full bg-(--line-strong)" />
          <span>{tempoLabel ? `${tempoLabel} BPM` : "Tempo not set"}</span>
        </div>
        {feedback && (
          <p className="mt-2.5 mb-0 text-[11px] text-(--muted)" role="status">
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
