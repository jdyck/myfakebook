"use client";

import {
  ScorePersistence,
  type LoadedScore,
} from "@/components/workspace/score-persistence";

type SavedChartsSidebarProps = {
  enabled: boolean;
  abc: string;
  title: string;
  hydrated: boolean;
  isPublicCatalog: boolean;
  currentScore: LoadedScore | null;
  onCurrentScoreChange: (score: LoadedScore | null) => void;
  onLibraryScoresChange: (scores: LoadedScore[]) => void;
  onLoad: (score: LoadedScore) => void;
  onStatus: (status: string) => void;
};

export function SavedChartsSidebar({
  enabled,
  abc,
  title,
  hydrated,
  isPublicCatalog,
  currentScore,
  onCurrentScoreChange,
  onLibraryScoresChange,
  onLoad,
  onStatus,
}: SavedChartsSidebarProps) {
  if (!enabled) return null;

  return (
    <aside
      className="min-w-0 border-r border-(--line) px-3.75 py-6.25 max-[720px]:hidden"
      aria-label="Saved charts"
    >
      <div className="grid gap-1 px-2">
        <span className="text-[13px] font-[680] text-foreground">Saved charts</span>
      </div>
      <ScorePersistence
        abc={abc}
        enabled={enabled}
        hydrated={hydrated}
        isPublicCatalog={isPublicCatalog}
        currentScore={currentScore}
        onCurrentScoreChange={onCurrentScoreChange}
        onLibraryScoresChange={onLibraryScoresChange}
        onLoad={onLoad}
        onStatus={onStatus}
        title={title}
      />
    </aside>
  );
}
