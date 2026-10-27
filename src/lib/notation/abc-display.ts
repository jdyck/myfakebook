import ABCJS from "abcjs";

export type SongDisplaySettings = {
  transposition: number;
  showChords: boolean;
  showLyrics: boolean;
  showParts?: boolean;
  showFirstLineClefOnly?: boolean;
};

export const DEFAULT_DISPLAY_SETTINGS: SongDisplaySettings = {
  transposition: 0,
  showChords: true,
  showLyrics: true,
  showParts: true,
  showFirstLineClefOnly: true,
};

type TranspositionChoice = {
  steps: number;
  key: string;
};

function keyLabelFromAbc(abc: string) {
  const keyField = abc.match(/^K:\s*([^\r\n]*)/m)?.[1]?.trim() ?? "C";
  if (/^none$/i.test(keyField)) return "No key";
  if (/^hp$/i.test(keyField)) return "Highland pipes";

  const key = keyField.match(
    /^([A-G][#b]?(?:\s*(?:major|maj|ionian|ion|minor|min|m|aeolian|aeo|mixolydian|mix|dorian|dor|phrygian|phr|lydian|lyd|locrian|loc))?)/i,
  )?.[1];
  return key?.replace(/\s+/g, " ").trim() || "Unknown key";
}

export function getTranspositionChoices(abc: string): TranspositionChoice[] {
  const steps = Array.from({ length: 25 }, (_, index) => index - 12);
  try {
    return transpositionChoices(abc, steps);
  } catch {
    // This runs during render, including while the user is editing incomplete ABC.
    return steps.map((steps) => ({ steps, key: "Unknown key" }));
  }
}

function transpositionChoices(abc: string, steps: number[]): TranspositionChoice[] {
  const source = abc.replaceAll("\r", "");
  let keyField = source.match(/^K:\s*([^\r\n]*)/m)?.[1]?.trim() ?? "C";
  if (!keyField) {
    const keySignature = ABCJS.parseOnly(source)[0]?.getKeySignature();
    keyField = keySignature?.root === "none"
      ? "none"
      : `${keySignature?.root ?? "C"}${keySignature?.acc ?? ""}${keySignature?.mode ?? ""}`;
  }

  const keySource = `K:${keyField}\nC`;
  const key = keyLabelFromAbc(keySource);
  // abcjs cannot transpose the synthetic C note with a keyless signature.
  if (key === "No key" || key === "Highland pipes") {
    return steps.map((steps) => ({ steps, key }));
  }
  const tunes = ABCJS.parseOnly(keySource);

  return steps.map((steps) => {
    const transposed = steps === 0 ? keySource : ABCJS.strTranspose(keySource, tunes, steps);
    return { steps, key: keyLabelFromAbc(transposed) };
  });
}

function prepareVisibilitySource(abc: string, settings: SongDisplaySettings) {
  let musicStarted = false;
  return abc
    .replaceAll("\r", "")
    .split("\n")
    .flatMap((line) => {
      if (!musicStarted) {
        if (/^K\s*:/i.test(line)) musicStarted = true;
        return [line];
      }
      if (!settings.showLyrics && /^W?:/i.test(line)) return [];
      if (!settings.showChords && !/^V\s*:/i.test(line)) return [line.replace(/"[^"]*"/g, "")];
      return [line];
    })
    .join("\n");
}

function normalizeChordAccidentals(abc: string) {
  let musicStarted = false;

  return abc
    .split("\n")
    .map((line) => {
      if (!musicStarted) {
        if (/^K\s*:/i.test(line)) musicStarted = true;
        return line;
      }
      if (/^V\s*:/i.test(line)) return line;

      return line.replace(/"([^"]*)"/g, (quoted, chord: string) => {
        const normalized = chord
          .replace(/^([A-G])b/, "$1♭")
          .replace(/^([A-G])#/, "$1♯")
          .replace(/\/([A-G])b(?=$|[^A-Za-z])/, "/$1♭")
          .replace(/\/([A-G])#(?=$|[^A-Za-z])/, "/$1♯");
        return normalized === chord ? quoted : `"${normalized}"`;
      });
    })
    .join("\n");
}

function removePartMarkers(abc: string) {
  return abc
    .split("\n")
    .flatMap((line) => {
      if (/^\s*P\s*:/i.test(line)) return [];
      return [line.replace(/\[P\s*:[^\]]*\]/gi, "")];
    })
    .join("\n");
}

export function prepareAbcForDisplay(abc: string, settings: SongDisplaySettings) {
  let prepared = prepareVisibilitySource(abc, settings);
  if (settings.showParts === false) prepared = removePartMarkers(prepared);
  if (settings.transposition) {
    const tunes = ABCJS.parseOnly(prepared);
    prepared = ABCJS.strTranspose(prepared, tunes, settings.transposition);
  }
  return normalizeChordAccidentals(prepared);
}

export function prepareAbcForExport(abc: string, settings: SongDisplaySettings) {
  let musicStarted = false;
  const prepared = abc
    .replaceAll("\r", "")
    .split("\n")
    .flatMap((line) => {
      if (!musicStarted) {
        if (/^K\s*:/i.test(line)) musicStarted = true;
        return [line];
      }
      if (!settings.showLyrics && /^W?:/i.test(line)) return [];

      let nextLine = line;
      if (!settings.showChords && !/^V\s*:/i.test(nextLine)) nextLine = nextLine.replace(/"[^"]*"/g, "");
      return [nextLine];
    })
    .join("\n");

  if (!settings.transposition) return prepared;
  const tunes = ABCJS.parseOnly(prepared);
  return ABCJS.strTranspose(prepared, tunes, settings.transposition);
}
