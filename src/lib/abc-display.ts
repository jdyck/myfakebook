import ABCJS from "abcjs";

export type SongDisplaySettings = {
  transposition: number;
  showChords: boolean;
  showLyrics: boolean;
};

export const DEFAULT_DISPLAY_SETTINGS: SongDisplaySettings = {
  transposition: 0,
  showChords: true,
  showLyrics: true,
};

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

export function prepareAbcForDisplay(abc: string, settings: SongDisplaySettings) {
  let prepared = prepareVisibilitySource(abc, settings);
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
