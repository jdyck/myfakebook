export const DEFAULT_ABC = `%abc-2.1
X:1
T:Midnight Walk
C:MyFakebook
M:4/4
L:1/8
Q:1/4=104
K:Dm
|: D2 F2 | A2 d2 | c2 A2 | F2 D2 :|
|: A2 c2 | d2 f2 | e2 c2 | A4 :|`;

const DIVISIONS = 480;

type Mode = "major" | "minor" | "dorian" | "mixolydian" | "lydian" | "phrygian" | "locrian";

type HeaderInfo = {
  title: string;
  composer?: string;
  keyRoot: string;
  keyAccidental: string;
  mode: Mode;
  meterNumerator: number;
  meterDenominator: number;
  defaultLength: number;
  tempo: number;
  bodyLines: string[];
  voiceCount: number;
};

type Pitch = {
  step: string;
  octave: number;
  alter?: number;
  accidental?: "sharp" | "double-sharp" | "flat" | "double-flat" | "natural";
};

type ParsedItem = {
  kind: "note" | "rest";
  duration: number;
  pitches: Pitch[];
  chord?: string;
  tieStart?: boolean;
  tieStop?: boolean;
};

type ParsedMeasure = {
  items: ParsedItem[];
  endBar?: string;
  leftRepeat?: boolean;
};

export type MusicXmlResult = {
  xml: string;
  title: string;
  warnings: string[];
  stats: {
    measures: number;
    notes: number;
    duration: string;
  };
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function fraction(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const [numerator, denominator] = value.split("/").map(Number);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return fallback;
  }
  return numerator / denominator;
}

function parseMeter(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized || normalized === "C") return { numerator: 4, denominator: 4 };
  if (normalized === "C|") return { numerator: 2, denominator: 2 };
  const match = normalized.match(/^(\d+)\s*\/\s*(\d+)/);
  if (!match) return { numerator: 4, denominator: 4 };
  return { numerator: Number(match[1]), denominator: Number(match[2]) };
}

function parseTempo(value: string | undefined) {
  const normalized = value?.trim() ?? "";
  const equalValue = normalized.match(/=\s*(\d+(?:\.\d+)?)/)?.[1];
  const plainValue = normalized.match(/\d+(?:\.\d+)?/)?.[0];
  const parsed = Number(equalValue ?? plainValue ?? 104);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 104;
}

function parseKey(value: string | undefined) {
  const normalized = value?.trim() ?? "C";
  const match = normalized.match(/^([A-Ga-g])([#b]?)([A-Za-z]*)/);
  if (!match) {
    return { root: "C", accidental: "", mode: "major" as Mode };
  }

  const suffix = match[3].toLowerCase();
  let mode: Mode = "major";
  if (suffix === "m" || suffix === "min" || suffix === "minor" || suffix === "aeo") {
    mode = "minor";
  } else if (suffix.startsWith("dor")) {
    mode = "dorian";
  } else if (suffix.startsWith("mix")) {
    mode = "mixolydian";
  } else if (suffix.startsWith("lyd")) {
    mode = "lydian";
  } else if (suffix.startsWith("phr")) {
    mode = "phrygian";
  } else if (suffix.startsWith("loc")) {
    mode = "locrian";
  }

  return {
    root: match[1].toUpperCase(),
    accidental: match[2],
    mode,
  };
}

function readHeaders(abc: string): HeaderInfo {
  const lines = abc.replaceAll("\r", "").split("\n");
  let title = "Untitled lead sheet";
  let composer: string | undefined;
  let meter: string | undefined;
  let length: string | undefined;
  let tempo: string | undefined;
  let key: string | undefined;
  let bodyStarted = false;
  const bodyLines: string[] = [];
  const voices = new Set<string>();

  for (const line of lines) {
    const field = line.match(/^([A-Z]):\s?(.*)$/);
    if (!bodyStarted && field) {
      const [, name, value] = field;
      if (name === "T" && title === "Untitled lead sheet") title = value.trim() || title;
      if (name === "C") composer = value.trim() || composer;
      if (name === "M") meter = value;
      if (name === "L") length = value;
      if (name === "Q") tempo = value;
      if (name === "K") {
        key = value;
        bodyStarted = true;
      }
      if (name === "V") voices.add(value.trim().split(/\s+/)[0] || "1");
      continue;
    }

    if (!bodyStarted && line.trim() && !line.trimStart().startsWith("%")) bodyStarted = true;
    if (bodyStarted) {
      const voiceField = line.match(/^V:\s*([^\s]+)/);
      if (voiceField) voices.add(voiceField[1]);
      bodyLines.push(line);
    }
  }

  const parsedMeter = parseMeter(meter);
  const defaultLength = fraction(length, parsedMeter.numerator >= 3 ? 1 / 8 : 1 / 16);
  const parsedKey = parseKey(key);

  return {
    title,
    composer,
    keyRoot: parsedKey.root,
    keyAccidental: parsedKey.accidental,
    mode: parsedKey.mode,
    meterNumerator: parsedMeter.numerator,
    meterDenominator: parsedMeter.denominator,
    defaultLength,
    tempo: parseTempo(tempo),
    bodyLines,
    voiceCount: voices.size,
  };
}

function readAccidental(value: string, start: number) {
  let index = start;
  let symbol = "";
  while (index < value.length && ["^", "_", "="].includes(value[index])) {
    symbol += value[index];
    index += 1;
  }

  if (!symbol) return { index, alter: undefined, accidental: undefined };
  if (symbol === "=") return { index, alter: 0, accidental: "natural" as const };
  if (symbol.startsWith("^")) {
    return {
      index,
      alter: symbol.length > 1 ? 2 : 1,
      accidental: symbol.length > 1 ? ("double-sharp" as const) : ("sharp" as const),
    };
  }
  return {
    index,
    alter: symbol.length > 1 ? -2 : -1,
    accidental: symbol.length > 1 ? ("double-flat" as const) : ("flat" as const),
  };
}

function readPitch(value: string, start: number): { pitch?: Pitch; index: number } {
  const accidental = readAccidental(value, start);
  let index = accidental.index;
  const letter = value[index];
  if (!letter || !/[A-Ga-g]/.test(letter)) return { index: start };
  index += 1;

  let octave = letter === letter.toLowerCase() ? 5 : 4;
  while (index < value.length && [",", "'"].includes(value[index])) {
    octave += value[index] === "," ? -1 : 1;
    index += 1;
  }

  return {
    index,
    pitch: {
      step: letter.toUpperCase(),
      octave,
      alter: accidental.alter,
      accidental: accidental.accidental,
    },
  };
}

function readDuration(value: string, start: number, defaultLength: number) {
  let index = start;
  let numerator = "";
  while (/\d/.test(value[index] ?? "")) {
    numerator += value[index];
    index += 1;
  }

  let slashCount = 0;
  while (value[index] === "/") {
    slashCount += 1;
    index += 1;
  }

  let denominator = "";
  while (/\d/.test(value[index] ?? "")) {
    denominator += value[index];
    index += 1;
  }

  let multiplier = numerator ? Number(numerator) : 1;
  if (slashCount > 0) {
    multiplier /= denominator ? Number(denominator) : 2 ** slashCount;
  }

  let dots = 0;
  while (value[index] === ".") {
    dots += 1;
    index += 1;
  }
  if (dots === 1) multiplier *= 1.5;
  if (dots > 1) multiplier *= 1.75;

  return { index, duration: defaultLength * 4 * multiplier };
}

function parsePitches(value: string) {
  const pitches: Pitch[] = [];
  let index = 0;
  while (index < value.length) {
    const parsed = readPitch(value, index);
    if (parsed.pitch) {
      pitches.push(parsed.pitch);
      index = parsed.index;
    } else {
      index += 1;
    }
  }
  return pitches;
}

function barTokenAt(value: string, index: number) {
  const tokens = [":|:", "::", "|]", "[|", "|:", ":|", "||", "|"];
  return tokens.find((token) => value.startsWith(token, index));
}

function parseMeasures(header: HeaderInfo) {
  const measures: ParsedMeasure[] = [];
  let current: ParsedItem[] = [];
  let pendingLeftRepeat = false;
  let activeVoice: string | undefined;
  const primaryVoice = header.bodyLines
    .map((line) => line.match(/^V:\s*([^\s]+)/)?.[1])
    .find(Boolean);
  let pendingChord: string | undefined;
  let pendingBrokenRatio = 1;
  let tieActive = false;

  const finishMeasure = (bar: string) => {
    if (current.length === 0) {
      pendingLeftRepeat = pendingLeftRepeat || bar.includes("|:");
      return;
    }
    measures.push({ items: current, endBar: bar, leftRepeat: pendingLeftRepeat });
    current = [];
    pendingLeftRepeat = bar.includes("|:");
  };

  for (const rawLine of header.bodyLines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("%") || trimmed.startsWith("w:") || trimmed.startsWith("W:")) {
      continue;
    }

    const voiceField = trimmed.match(/^V:\s*([^\s]+)/);
    if (voiceField) {
      activeVoice = voiceField[1];
      continue;
    }
    if (primaryVoice && activeVoice && activeVoice !== primaryVoice) continue;

    let index = 0;
    while (index < rawLine.length) {
      const char = rawLine[index];
      if (/\s/.test(char)) {
        index += 1;
        continue;
      }
      if (char === "%") break;

      const bar = barTokenAt(rawLine, index);
      if (bar) {
        finishMeasure(bar);
        index += bar.length;
        continue;
      }

      if (char === '"') {
        const closing = rawLine.indexOf('"', index + 1);
        if (closing === -1) break;
        pendingChord = rawLine.slice(index + 1, closing);
        index = closing + 1;
        continue;
      }

      if (char === "!") {
        const closing = rawLine.indexOf("!", index + 1);
        index = closing === -1 ? rawLine.length : closing + 1;
        continue;
      }

      if (char === "+") {
        const closing = rawLine.indexOf("+", index + 1);
        index = closing === -1 ? rawLine.length : closing + 1;
        continue;
      }

      if (char === "(") {
        index += 1;
        while (/\d/.test(rawLine[index] ?? "")) index += 1;
        continue;
      }

      if (char === "[") {
        const closing = rawLine.indexOf("]", index + 1);
        if (closing === -1) {
          index += 1;
          continue;
        }
        const inside = rawLine.slice(index + 1, closing);
        if (/^(?:V|K|P):/.test(inside) || /^\d/.test(inside)) {
          index = closing + 1;
          continue;
        }
        const duration = readDuration(rawLine, closing + 1, header.defaultLength);
        const pitches = parsePitches(inside);
        if (pitches.length > 0) {
          const item: ParsedItem = {
            kind: "note",
            duration: duration.duration * pendingBrokenRatio,
            pitches,
            chord: pendingChord,
            tieStop: tieActive,
          };
          current.push(item);
          pendingChord = undefined;
          tieActive = false;
          index = duration.index;
          if (rawLine[index] === "-") {
            item.tieStart = true;
            tieActive = true;
            index += 1;
          }
          pendingBrokenRatio = 1;
          continue;
        }
        index = closing + 1;
        continue;
      }

      const pitch = readPitch(rawLine, index);
      const isRest = ["z", "x", "s"].includes(char);
      if (pitch.pitch || isRest) {
        const afterPitch = pitch.pitch ? pitch.index : index + 1;
        const duration = readDuration(rawLine, afterPitch, header.defaultLength);
        const item: ParsedItem = {
          kind: pitch.pitch ? "note" : "rest",
          duration: duration.duration * pendingBrokenRatio,
          pitches: pitch.pitch ? [pitch.pitch] : [],
          chord: pitch.pitch ? pendingChord : undefined,
          tieStop: pitch.pitch ? tieActive : undefined,
        };
        current.push(item);
        pendingChord = undefined;
        tieActive = false;
        index = duration.index;

        if (rawLine[index] === "-") {
          item.tieStart = Boolean(pitch.pitch);
          tieActive = Boolean(pitch.pitch);
          index += 1;
        }

        if (rawLine[index] === ">" || rawLine[index] === "<") {
          const modifier = rawLine[index];
          let count = 0;
          while (rawLine[index] === modifier) {
            count += 1;
            index += 1;
          }
          const currentRatio = count > 1 ? 7 / 4 : 3 / 2;
          item.duration *= currentRatio;
          pendingBrokenRatio = 1 / currentRatio;
        } else {
          pendingBrokenRatio = 1;
        }
        continue;
      }

      index += 1;
    }
  }

  if (current.length > 0 || measures.length === 0) {
    measures.push({ items: current, leftRepeat: pendingLeftRepeat });
  }

  return measures;
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
  lines.push(`</note>`);
  return lines;
}

export function abcToMusicXml(abc: string): MusicXmlResult {
  if (!abc.trim()) throw new Error("ABC source is empty.");

  const header = readHeaders(abc);
  const measures = parseMeasures(header);
  const notes = measures.reduce(
    (total, measure) => total + measure.items.reduce((count, item) => count + (item.kind === "note" ? item.pitches.length : 0), 0),
    0,
  );
  if (notes === 0) throw new Error("No notes were found. Add a K: field followed by ABC music.");

  const warnings: string[] = [];
  if (header.voiceCount > 1) warnings.push("Multiple voices detected; the first voice is exported.");
  if (!/^[\s\S]*^K:/m.test(abc)) warnings.push("No key field was found; C major was assumed.");

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

  const quarterDuration = measures.reduce(
    (total, measure) => total + measure.items.reduce((sum, item) => sum + item.duration, 0),
    0,
  );
  const durationLabel = `${Math.max(1, Math.ceil(quarterDuration / 4))} bars`;

  return {
    xml: xml.join("\n"),
    title: header.title,
    warnings,
    stats: {
      measures: measures.length,
      notes,
      duration: durationLabel,
    },
  };
}
