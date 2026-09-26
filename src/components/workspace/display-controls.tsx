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
      className={componentStyles.style0}
    >
      <legend className={componentStyles.style1}>Display controls</legend>
      <label className={componentStyles.style2}>
        Transpose
        <select
          aria-label="Song transposition"
          className={componentStyles.style3}
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
        <label className={componentStyles.style4} key={setting}>
          <input
            aria-label={label}
            checked={settings[setting]}
            className={componentStyles.style5}
            type="checkbox"
            onChange={(event) => onChange({ [setting]: event.target.checked })}
          />
          {label.replace("Show ", "")}
        </label>
      ))}
    </fieldset>
  );
}
