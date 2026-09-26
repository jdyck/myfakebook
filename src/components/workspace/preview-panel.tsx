"use client";

import type { ReactNode } from "react";
import { Music2 } from "lucide-react";

import { AbcPreview } from "@/components/workspace/abc-preview";
import type { SongDisplaySettings } from "@/lib/abc-display";
import componentStyles from "./preview-panel.module.css";

type PreviewPanelProps = {
  abc: string;
  displaySettings: SongDisplaySettings;
  saveAction: ReactNode;
  publishAction: ReactNode;
};

export function PreviewPanel({ abc, displaySettings, saveAction, publishAction }: PreviewPanelProps) {
  return (
    <section
      className={componentStyles.style0}
      aria-label="Lead sheet preview"
    >
      <div className={componentStyles.style1}>
        <div className={componentStyles.style2}>
          <Music2 className={componentStyles.style3} size={15} strokeWidth={1.8} />
          Preview
        </div>
      </div>
      <div className={componentStyles.style4}>
        <AbcPreview
          abc={abc}
          key={abc}
          showChords={displaySettings.showChords}
          showLyrics={displaySettings.showLyrics}
          transposition={displaySettings.transposition}
          saveAction={saveAction}
          publishAction={publishAction}
        />
      </div>
    </section>
  );
}
