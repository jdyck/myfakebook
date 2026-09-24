"use client";

import type { ChartDisplaySettings } from "@/lib/abc-display";

type DisplayControlsProps = {
  settings: ChartDisplaySettings;
  onChange: (patch: Partial<ChartDisplaySettings>) => void;
};

export function DisplayControls({ settings, onChange }: DisplayControlsProps) {
  return (
    <fieldset
      aria-label="Display controls"
      className="flex flex-wrap items-center justify-end gap-2 border-0 p-0 max-[720px]:justify-start"
    >
      <legend className="sr-only">Display controls</legend>
      <label className="flex items-center gap-1.5 text-[10px] font-[650] text-(--muted)">
        Transpose
        <select
          aria-label="Chart transposition"
          className="rounded-[6px] border border-(--line-strong) bg-(--paper) px-1.5 py-1 text-[10px] text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)"
          value={settings.transposition}
          onChange={(event) => onChange({ transposition: Number(event.target.value) })}
        >
          {Array.from({ length: 25 }, (_, index) => index - 12).map((steps) => (
            <option key={steps} value={steps}>
              {steps > 0 ? `+${steps}` : steps}
            </option>
          ))}
        </select>
      </label>
      {([
        ["showChords", "Show chords"],
        ["showLyrics", "Show lyrics"],
      ] as const).map(([setting, label]) => (
        <label className="inline-flex items-center gap-1 text-[10px] font-[650] text-[var(--muted)]" key={setting}>
          <input
            aria-label={label}
            checked={settings[setting]}
            className="size-3 accent-[var(--accent)]"
            type="checkbox"
            onChange={(event) => onChange({ [setting]: event.target.checked })}
          />
          {label.replace("Show ", "")}
        </label>
      ))}
    </fieldset>
  );
}
