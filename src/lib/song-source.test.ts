import { expect, test } from "vitest";
import { resolveSongSource } from "./song-source";
import { abcToSongContent, type SongContent } from "./song-content";

const content: SongContent = {
  meter: "3/4", unitLength: "1/4",
  measures: [{ chords: [["F", 2], ["C7", 1]], melody: "d2 A", lyrics: "Toy- land!" }],
};
const inline = 'X:1\nT:Song\nM:3/4\nL:1/4\nK:F\n"Bb"d2 "C7"A |\nw:Toy- land!';
const parts = 'X:1\nT:Song\nM:3/4\nL:1/4\nK:F\nV:chords\n"Gm"x2 "C7"x |\nV:melody\nd2 A |\nw:Toy- land!';

test("a populated object wins over both stored ABC representations", () => {
  const source = resolveSongSource({ title: "Song", content, abc: inline, abcParts: parts });
  expect(source.content).toEqual(content);
  expect(source.abc).toContain('"F"d2');
  expect(source.abc).not.toContain('"Bb"');
  expect(source.abcParts).toContain('"F"x2');
});

test.each([undefined, null, {}, { ...content, measures: [] }])("blank object %j falls back to inline ABC before separate parts", (blank) => {
  const source = resolveSongSource({ title: "Song", content: blank, abc: inline, abcParts: parts });
  expect(source.abc).toBe(inline);
  expect(source.content).toEqual(abcToSongContent(inline));
});

test("blank inline ABC falls back to separate parts and builds the object", () => {
  const source = resolveSongSource({ title: "Song", content: {}, abc: " \n", abcParts: parts });
  expect(source.content.measures[0].chords).toEqual([["Gm", 2], ["C7", 1]]);
  expect(source.abc).not.toContain("V:");
  expect(source.abc).toContain('"Gm"d2');
  expect(source.abcParts).toBe(parts);
});

test("malformed lower-priority sources cannot override a populated object", () => {
  const source = resolveSongSource({ title: "Song", content, abc: 'K:C\nV:chords\nx4 |', abcParts: 'K:C\nV:melody\nC4 |' });
  expect(source.content).toEqual(content);
  expect(source.abc).toContain('"F"d2');
});

test("an object-only record can reuse key and tempo from separate ABC headers", () => {
  const source = resolveSongSource({ title: "Song", content, abcParts: parts.replace("K:F", "Q:1/4=160\nK:F") });
  expect(source.abc).toContain("K:F");
  expect(source.abc).toContain("Q:1/4=160");
});

test("clearing all measures in JSON does not restore the previous melody", () => {
  const source = resolveSongSource({ title: "Song", content: { ...content, measures: [] } }, inline);
  expect(source.content.measures).toEqual([]);
  expect(source.abc).not.toContain("d2");
});
