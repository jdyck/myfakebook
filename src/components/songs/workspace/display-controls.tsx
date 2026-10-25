"use client";

import { useId, useMemo, useState } from "react";
import { ArrowRightLeft, ChevronDown, SlidersHorizontal } from "lucide-react";
import { concertKeyLabel } from "@/lib/notation/song-metadata";
import { getTranspositionChoices } from "@/lib/notation/abc-display";
import type { SongDisplaySettings } from "@/lib/notation/abc-display";
import { Select } from "@/components/ui/select";
import componentStyles from "./display-controls.module.css";

type DisplayControlsProps = {
  abc: string;
  settings: SongDisplaySettings;
  onChange: (patch: Partial<SongDisplaySettings>) => void;
};

export function DisplayControls({ abc, settings, onChange }: DisplayControlsProps) {
  const titleId = useId();
  const [expanded, setExpanded] = useState(false);
  const choices = useMemo(() => getTranspositionChoices(abc), [abc]);

  return (
    <>
      <section className={componentStyles.transposeSection} aria-label="Transpose song">
        <div className={componentStyles.controlLabel}>
          <label htmlFor={`${titleId}-key`}>TRANSPOSE</label>
          <button type="button" onClick={() => onChange({ transposition: 0 })}>Reset</button>
        </div>
        <div className={componentStyles.keyControl}>
          <Select
            id={`${titleId}-key`}
            ariaLabel="Concert key"
            variant="display"
            popupSize="scrollable"
            value={settings.transposition}
            onValueChange={(value) => onChange({ transposition: Number(value) })}
            options={choices.map(({ key, steps }) => ({ value: steps, label: `${concertKeyLabel(key)}${steps < 0 ? " (down)" : steps === 12 ? " (up an octave)" : ""}` }))}
          />
          <ArrowRightLeft size={21} strokeWidth={1.5} aria-hidden="true" />
        </div>
        <p className={componentStyles.utilityNote}>{settings.transposition === 0 ? "Original key" : `${settings.transposition > 0 ? "+" : ""}${settings.transposition} semitone${Math.abs(settings.transposition) === 1 ? "" : "s"}`} · Concert pitch</p>
      </section>
      <section className={componentStyles.viewSection}>
        <button className={componentStyles.disclosure} type="button" aria-expanded={expanded} aria-controls={`${titleId}-options`} onClick={() => setExpanded(!expanded)}>
          <span><SlidersHorizontal size={15} strokeWidth={1.5} aria-hidden="true" />View options</span><ChevronDown size={12} aria-hidden="true" />
        </button>
        <div id={`${titleId}-options`} hidden={!expanded} className={componentStyles.viewPanel}>
          {([
            ["showChords", "Show chords", settings.showChords],
            ["showLyrics", "Show lyrics", settings.showLyrics],
            ["showParts", "Show parts", settings.showParts ?? true],
            ["showFirstLineClefOnly", "Only show clef and key on the first line", settings.showFirstLineClefOnly ?? true],
          ] as const).map(([setting, label, checked]) => (
            <label className={componentStyles.checkRow} key={setting}><input checked={checked} type="checkbox" onChange={(event) => onChange({ [setting]: event.target.checked })} />{label}</label>
          ))}
        </div>
      </section>
    </>
  );
}
