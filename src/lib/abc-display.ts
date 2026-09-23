import ABCJS from "abcjs";

export type ChartDisplaySettings = {
  transposition: number;
  showChords: boolean;
  showLyrics: boolean;
};

export const DEFAULT_DISPLAY_SETTINGS: ChartDisplaySettings = {
  transposition: 0,
  showChords: true,
  showLyrics: true,
};

function prepareVisibilitySource(abc: string, settings: ChartDisplaySettings) {
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

export function prepareAbcForDisplay(abc: string, settings: ChartDisplaySettings) {
  let prepared = prepareVisibilitySource(abc, settings);
  if (settings.transposition) {
    const tunes = ABCJS.parseOnly(prepared);
    prepared = ABCJS.strTranspose(prepared, tunes, settings.transposition);
  }
  return prepared;
}

export function prepareAbcForExport(abc: string, settings: ChartDisplaySettings) {
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
