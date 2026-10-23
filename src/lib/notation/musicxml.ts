import type { HeaderInfo, Mode, ParsedItem, ParsedMeasure, Pitch } from "./parser";

const DIVISIONS = 480;

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function pitchClass(root: string, accidental: string) {
  const values: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  return (values[root] + (accidental === "#" ? 1 : accidental === "b" ? -1 : 0) + 12) % 12;
}

function majorFifths(root: string, accidental: string) {
  const table: Record<string, number> = {
    C: 0,
    "G": 1,
    D: 2,
    A: 3,
    E: 4,
    B: 5,
    F: -1,
    "F#": 6,
    "C#": 7,
    "Bb": -2,
    "Eb": -3,
    "Ab": -4,
    "Db": -5,
    "Gb": -6,
    "Cb": -7,
  };
  return table[`${root}${accidental}`] ?? 0;
}

function keyFifths(header: HeaderInfo) {
  const root = `${header.keyRoot}${header.keyAccidental}`;
  if (header.mode === "major") return majorFifths(header.keyRoot, header.keyAccidental);

  if (header.mode === "minor") {
    const table: Record<string, number> = {
      A: 0,
      E: 1,
      B: 2,
      "F#": 3,
      "C#": 4,
      "G#": 5,
      "D#": 6,
      "A#": 7,
      D: -1,
      G: -2,
      C: -3,
      F: -4,
      Bb: -5,
      Eb: -6,
    };
    return table[root] ?? 0;
  }

  const offsets: Record<Exclude<Mode, "major" | "minor">, number> = {
    dorian: -2,
    mixolydian: -7,
    lydian: -5,
    phrygian: -4,
    locrian: 1,
  };
  const relativeMajorPitch = (pitchClass(header.keyRoot, header.keyAccidental) + offsets[header.mode] + 12) % 12;
  const relativeMajor: Record<number, [string, string]> = {
    0: ["C", ""],
    1: ["C", "#"],
    2: ["D", ""],
    3: ["Eb", ""],
    4: ["E", ""],
    5: ["F", ""],
    6: ["F", "#"],
    7: ["G", ""],
    8: ["Ab", ""],
    9: ["A", ""],
    10: ["Bb", ""],
    11: ["B", ""],
  };
  const [relativeRoot, relativeAccidental] = relativeMajor[relativeMajorPitch];
  return majorFifths(relativeRoot, relativeAccidental);
}

function noteType(duration: number) {
  const candidates = [
    { type: "whole", length: 4 },
    { type: "half", length: 2 },
    { type: "quarter", length: 1 },
    { type: "eighth", length: 0.5 },
    { type: "16th", length: 0.25 },
    { type: "32nd", length: 0.125 },
  ];
  let best = candidates[2];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const distance = Math.abs(candidate.length - duration);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  const dots = Math.abs(duration / best.length - 1.5) < 0.1 ? 1 : 0;
  return { type: best.type, dots };
}

function xmlPitch(pitch: Pitch) {
  const lines = [`<pitch>`, `<step>${pitch.step}</step>`];
  if (pitch.alter !== undefined) lines.push(`<alter>${pitch.alter}</alter>`);
  lines.push(`<octave>${pitch.octave}</octave>`, `</pitch>`);
  if (pitch.accidental) lines.push(`<accidental>${pitch.accidental}</accidental>`);
  return lines;
}

function harmonyXml(chord: string) {
  const match = chord.trim().match(/^([A-Ga-g])([#b]?)([^/]*)(?:\/(.*))?$/);
  if (!match) return [];
  const [, root, accidental, suffix, bass] = match;
  const kindMap: Record<string, string> = {
    "": "major",
    m: "minor",
    min: "minor",
    "7": "dominant",
    maj7: "major-seventh",
    M7: "major-seventh",
    m7: "minor-seventh",
    dim: "diminished",
    dim7: "diminished-seventh",
    aug: "augmented",
    sus: "suspended-fourth",
  };
  const safeSuffix = suffix.trim();
  const lines = [
    `<harmony>`,
    `<root>`,
    `<root-step>${root.toUpperCase()}</root-step>`,
  ];
  if (accidental) lines.push(`<root-alter>${accidental === "#" ? 1 : -1}</root-alter>`);
  lines.push(`</root>`, `<kind>${kindMap[safeSuffix] ?? "other"}</kind>`);
  if (kindMap[safeSuffix] === undefined && safeSuffix) {
    lines.push(`<degree><degree-value>1</degree-value><degree-alter>0</degree-alter><degree-type>add</degree-type></degree>`);
  }
  if (bass) {
    const bassMatch = bass.match(/^([A-Ga-g])([#b]?)/);
    if (bassMatch) {
      lines.push(`<bass><bass-step>${bassMatch[1].toUpperCase()}</bass-step>`);
      if (bassMatch[2]) lines.push(`<bass-alter>${bassMatch[2] === "#" ? 1 : -1}</bass-alter>`);
      lines.push(`</bass>`);
    }
  }
  lines.push(`</harmony>`);
  return lines;
}

function barlineXml(bar: string | undefined, location: "left" | "right") {
  if (!bar && location === "right") return [];
  const value = bar ?? "|";
  const style =
    value === "|]" || (location === "right" && value.includes(":|"))
      ? "light-heavy"
      : value === "[|" || (location === "left" && value.includes("|:"))
        ? "heavy-light"
        : value === "||" || value.includes(":|:")
          ? "light-light"
          : "regular";
  const lines = [`<barline location="${location}">`, `<bar-style>${style}</bar-style>`];
  if (location === "left" && value.includes("|:")) lines.push(`<repeat direction="forward"/>`);
  if (location === "right" && value.includes(":|")) lines.push(`<repeat direction="backward"/>`);
  lines.push(`</barline>`);
  return lines;
}

function noteXml(item: ParsedItem, pitch: Pitch | undefined, chordIndex: number) {
  const duration = Math.max(1, Math.round(item.duration * DIVISIONS));
  const display = noteType(item.duration);
  const lines = [`<note>`];
  if (chordIndex > 0) lines.push(`<chord/>`);
  if (pitch) lines.push(...xmlPitch(pitch));
  else lines.push(`<rest/>`);
  lines.push(`<duration>${duration}</duration>`, `<voice>1</voice>`, `<type>${display.type}</type>`);
  for (let index = 0; index < display.dots; index += 1) lines.push(`<dot/>`);
  if (item.tieStop) lines.push(`<tie type="stop"/>`);
  if (item.tieStart) lines.push(`<tie type="start"/>`);
  if (item.tieStop || item.tieStart) {
    lines.push(`<notations>`);
    if (item.tieStop) lines.push(`<tied type="stop"/>`);
    if (item.tieStart) lines.push(`<tied type="start"/>`);
    lines.push(`</notations>`);
  }
  if (item.lyric) lines.push(`<lyric><text>${escapeXml(item.lyric)}</text></lyric>`);
  lines.push(`</note>`);
  return lines;
}

export function renderMusicXml(header: HeaderInfo, measures: ParsedMeasure[]) {
  const keyMode = header.mode === "minor" ? "minor" : "major";
  const xml: string[] = [
    `<?xml version="1.0" encoding="UTF-8" standalone="no"?>`,
    `<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">`,
    `<score-partwise version="4.0">`,
    `  <work><work-title>${escapeXml(header.title)}</work-title></work>`,
    `  <identification>`,
    header.composer ? `    <creator type="composer">${escapeXml(header.composer)}</creator>` : `    <creator type="software">MyFakebook</creator>`,
    `    <encoding><software>MyFakebook ABC converter</software></encoding>`,
    `  </identification>`,
    `  <part-list>`,
    `    <score-part id="P1"><part-name>${escapeXml(header.title)}</part-name></score-part>`,
    `  </part-list>`,
    `  <part id="P1">`,
  ];

  measures.forEach((measure, measureIndex) => {
    const number = measureIndex + 1;
    xml.push(`    <measure number="${number}">`);
    if (measure.leftRepeat) xml.push(...barlineXml("|:", "left").map((line) => `      ${line}`));
    if (measureIndex === 0) {
      xml.push(
        `      <attributes>`,
        `        <divisions>${DIVISIONS}</divisions>`,
        `        <key><fifths>${keyFifths(header)}</fifths><mode>${keyMode}</mode></key>`,
        `        <time><beats>${header.meterNumerator}</beats><beat-type>${header.meterDenominator}</beat-type></time>`,
        `        <clef><sign>G</sign><line>2</line></clef>`,
        `      </attributes>`,
        `      <direction placement="above">`,
        `        <direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${header.tempo}</per-minute></metronome></direction-type>`,
        `        <sound tempo="${header.tempo}"/>`,
        `      </direction>`,
      );
    }

    for (const item of measure.items) {
      if (item.chord) xml.push(...harmonyXml(item.chord).map((line) => `      ${line}`));
      if (item.kind === "rest") {
        xml.push(...noteXml(item, undefined, 0).map((line) => `      ${line}`));
      } else {
        item.pitches.forEach((pitch, index) => {
          xml.push(...noteXml(item, pitch, index).map((line) => `      ${line}`));
        });
      }
    }

    if (measure.endBar) {
      xml.push(...barlineXml(measure.endBar, "right").map((line) => `      ${line}`));
    }
    xml.push(`    </measure>`);
  });

  xml.push(`  </part>`, `</score-partwise>`);
  return xml.join("\n");
}
