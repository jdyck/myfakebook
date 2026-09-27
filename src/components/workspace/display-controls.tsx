"use client";

import type { SongDisplaySettings } from "@/lib/abc-display";
import componentStyles from "./display-controls.module.css";

type DisplayControlsProps = {
  settings: SongDisplaySettings;
  onChange: (patch: Partial<SongDisplaySettings>) => void;
};

export function DisplayControls({ settings, onChange }: DisplayControlsProps) {
  return (
    <fieldset
      aria-label="Display controls"
      className={componentStyles.displaySettings}
    >
      <legend className={componentStyles.displaySettingsLegend}>Display controls</legend>
      <label className={componentStyles.transposeFieldLabel}>
        Transpose
        <select
          aria-label="Song transposition"
          className={componentStyles.transposeSelect}
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
        <label className={componentStyles.displayToggleLabel} key={setting}>
          <input
            aria-label={label}
            checked={settings[setting]}
            className={componentStyles.displayToggleCheckbox}
            type="checkbox"
            onChange={(event) => onChange({ [setting]: event.target.checked })}
          />
          {label.replace("Show ", "")}
        </label>
      ))}
    </fieldset>
  );
}
