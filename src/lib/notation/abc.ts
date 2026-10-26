import { parseAbc } from "./parser";
import { renderMusicXml } from "./musicxml";

export const DEFAULT_ABC = `%abc-2.1
X:1
T:Untitled
C:
M:4/4
L:1/8
Q:1/4=104
K:C`;

type MusicXmlResult = {
  xml: string;
  title: string;
};

export function abcToMusicXml(abc: string): MusicXmlResult {
  if (!abc.trim()) throw new Error("ABC source is empty.");

  const { header, measures } = parseAbc(abc);
  const musicalEvents = measures.reduce((total, measure) => total + measure.items.length, 0);
  if (musicalEvents === 0) throw new Error("No notes were found. Add a K: field followed by ABC music.");

  return {
    xml: renderMusicXml(header, measures),
    title: header.title,
  };
}
