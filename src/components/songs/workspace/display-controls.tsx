"use client";

import { useId, useRef } from "react";
import type { SongDisplaySettings } from "@/lib/notation/abc-display";
import { Button } from "@/components/ui/button";
import { TransposeMenu } from "@/components/songs/workspace/transpose-menu";
import componentStyles from "./display-controls.module.css";

type DisplayControlsProps = {
  abc: string;
  settings: SongDisplaySettings;
  onChange: (patch: Partial<SongDisplaySettings>) => void;
};

export function DisplayControls({ abc, settings, onChange }: DisplayControlsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <div className={componentStyles.displayControls}>
      <fieldset aria-label="Transpose song" className={componentStyles.displaySettings}>
        <legend className={componentStyles.displaySettingsLegend}>Transpose song</legend>
        <div className={componentStyles.transposeFieldLabel}>
          <TransposeMenu
            abc={abc}
            ariaLabel="Song transposition"
            value={settings.transposition}
            onChange={(transposition) => onChange({ transposition })}
          />
        </div>
      </fieldset>

      <Button
        aria-haspopup="dialog"
        size="compact"
        type="button"
        variant="secondary"
        onClick={() => {
          const dialog = dialogRef.current;
          if (dialog && !dialog.open) dialog.showModal();
        }}
      >
        View options
      </Button>

      <dialog
        aria-labelledby={titleId}
        className={componentStyles.optionsDialog}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        ref={dialogRef}
      >
        <section className={componentStyles.optionsDialogContent}>
          <header className={componentStyles.optionsDialogHeader}>
            <h2 className={componentStyles.optionsDialogTitle} id={titleId}>View options</h2>
          </header>
          <fieldset aria-label="Show on score" className={componentStyles.optionsList}>
            <legend className={componentStyles.optionsLegend}>Show on score</legend>
            {([
              ["showChords", "Show chords", settings.showChords],
              ["showLyrics", "Show lyrics", settings.showLyrics],
              ["showParts", "Show parts", settings.showParts ?? true],
              ["showFirstLineClefOnly", "Only show clef and key on the first line", settings.showFirstLineClefOnly ?? true],
            ] as const).map(([setting, label, checked]) => (
              <label className={componentStyles.displayToggleLabel} key={setting}>
                <input
                  checked={checked}
                  className={componentStyles.displayToggleCheckbox}
                  type="checkbox"
                  onChange={(event) => onChange({ [setting]: event.target.checked })}
                />
                {label}
              </label>
            ))}
          </fieldset>
          <footer className={componentStyles.optionsDialogFooter}>
            <Button
              autoFocus
              size="compact"
              type="button"
              variant="secondary"
              onClick={() => dialogRef.current?.close()}
            >
              Done
            </Button>
          </footer>
        </section>
      </dialog>
    </div>
  );
}
