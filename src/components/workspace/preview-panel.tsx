"use client";

import type { ReactNode } from "react";
import { Music2 } from "lucide-react";

import { AbcPreview } from "@/components/workspace/abc-preview";
import type { ChartDisplaySettings } from "@/lib/abc-display";

type PreviewPanelProps = {
  abc: string;
  displaySettings: ChartDisplaySettings;
  saveAction: ReactNode;
  publishAction: ReactNode;
};

export function PreviewPanel({ abc, displaySettings, saveAction, publishAction }: PreviewPanelProps) {
  return (
    <section
      className="flex flex-col overflow-hidden rounded-[11px] border border-(--line) bg-(--paper) w-xl "
      aria-label="Lead sheet preview"
    >
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-[var(--line)] px-3.5 max-[720px]:px-3">
        <div className="flex items-center gap-2 text-[12px] font-[700] text-[var(--ink)]">
          <Music2 className="text-[var(--accent)]" size={15} strokeWidth={1.8} />
          Preview
        </div>
      </div>
      <div className="flex min-h-[570px] flex-1 flex-col p-3.5 max-[1080px]:min-h-[520px] max-[720px]:min-h-[440px] max-[720px]:p-3">
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
