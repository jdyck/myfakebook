import { parseAbc } from "./abc/parser";
import { renderMusicXml } from "./abc/musicxml";

export const DEFAULT_ABC = `%abc-2.1
X:1
T:Untitled
C:
M:4/4
L:1/8
Q:1/4=104
K:C`;

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

export function abcToMusicXml(abc: string): MusicXmlResult {
  if (!abc.trim()) throw new Error("ABC source is empty.");

  const { header, measures } = parseAbc(abc);
  const notes = measures.reduce(
    (total, measure) => total + measure.items.reduce((count, item) => count + (item.kind === "note" ? item.pitches.length : 0), 0),
    0,
  );
  const musicalEvents = measures.reduce((total, measure) => total + measure.items.length, 0);
  if (musicalEvents === 0) throw new Error("No notes were found. Add a K: field followed by ABC music.");

  const warnings: string[] = [];
  if (header.voiceCount > 1) warnings.push("Multiple voices detected; the first voice is exported.");
  if (!/^[\s\S]*^K:/m.test(abc)) warnings.push("No key field was found; C major was assumed.");

  const quarterDuration = measures.reduce(
    (total, measure) => total + measure.items.reduce((sum, item) => sum + item.duration, 0),
    0,
  );

  return {
    xml: renderMusicXml(header, measures),
    title: header.title,
    warnings,
    stats: {
      measures: measures.length,
      notes,
      duration: `${Math.max(1, Math.ceil(quarterDuration / 4))} bars`,
    },
  };
}
