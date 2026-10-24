import { getTranspositionChoices } from "./abc-display";

export function concertKeyLabel(key: string) {
  const normalized = key.replace(/#/g, "♯").replace(/^([A-G])b/, "$1♭");
  if (/^[A-G][♯♭]?$/.test(normalized)) return `${normalized} major`;
  return normalized.replace(/^([A-G][♯♭]?)\s*(?:minor|min|m)$/i, "$1 minor");
}

export function getSongMetadata(abc: string, transposition = 0) {
  const header = abc.replaceAll("\r", "").split(/^K\s*:/m)[0];
  const writers = Array.from(header.matchAll(/^C:\s*(.+)$/gm), (match) => match[1].trim()).join(" / ");
  const rhythm = (header.match(/^R:\s*(.+)$/m)?.[1]?.trim() ?? "").replace(/^\((.*)\)$/, "$1");
  const meter = header.match(/^M:\s*(.+)$/m)?.[1]?.trim() ?? "4/4";
  let key = "Unknown key";
  try {
    key = getTranspositionChoices(abc).find((choice) => choice.steps === transposition)?.key ?? key;
  } catch {
    // Metadata must not prevent the editor from opening malformed notation.
  }
  return { writers, rhythm, meter, key, keyLabel: concertKeyLabel(key) };
}
