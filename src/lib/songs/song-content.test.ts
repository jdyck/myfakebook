import { expect, test } from "vitest";
import { abcToSongContent, songContentToAbc, type SongContent } from "./song-content";

const content: SongContent = {
  meter: "3/4",
  unitLength: "1/4",
  measures: [{ chords: [["F", 2], ["C7", 1]], melody: "d2 A", lyrics: "Toy- land!" }],
};

test("the requested object generates ABC and round-trips", () => {
  const abc = songContentToAbc(content, "Toyland");
  expect(abc).toContain('"F"d2 "C7"A |\nw:Toy- land!');
  expect(abcToSongContent(abc)).toEqual(content);
});

test("chord durations use unit length and carry over bar lines", () => {
  expect(abcToSongContent('M:3/4\nL:1/8\nK:C\n"F"d4 "C7"A2 | A6 |').measures).toEqual([
    { chords: [["F", 4], ["C7", 2]], melody: "d4 A2", lyrics: "" },
    { chords: [["C7", 6]], melody: "A6", lyrics: "" },
  ]);
});

test("lyrics are assigned to each measure and skip rests", () => {
  expect(abcToSongContent('M:3/4\nL:1/4\nK:C\nz d A | B3 |\nw:Toy-land! yay').measures).toEqual([
    { chords: [], melody: "z d A", lyrics: "Toy- land!" },
    { chords: [], melody: "B3", lyrics: "yay" },
  ]);
});

test("chord timing accounts for tuplets and broken rhythms", () => {
  const parsed = abcToSongContent('M:4/4\nL:1/4\nK:C\n"C"(3CDE "G"F>G |');
  expect(parsed.measures[0].chords).toEqual([["C", 2], ["G", 2]]);
});

test("chord changes inside a held note split and tie it", () => {
  const abc = songContentToAbc({ ...content, measures: [{ ...content.measures[0], melody: "d3" }] }, "Song");
  expect(abc).toContain('"F"d2- "C7"d |');
});

test("object edits preserve existing key and tempo headers", () => {
  const abc = songContentToAbc(content, "New title", 'X:2\nT:Old title\nC:Writer\nM:4/4\nL:1/8\nQ:1/4=120\nK:F\nC|');
  expect(abc).toContain("C:Writer");
  expect(abc).toContain("Q:1/4=120");
  expect(abc).toContain("K:F");
  expect(abc).toContain("T:New title\nM:3/4\nL:1/4");
  expect(abc).not.toContain("T:Old title");
});

test("an explicit harmony gap clears the previous measure's chord", () => {
  const next: SongContent = {
    ...content,
    measures: [content.measures[0], { chords: [["", 2], ["F", 1]], melody: "d2 A", lyrics: "" }],
  };
  expect(abcToSongContent(songContentToAbc(next, "Song"))).toEqual(next);
});

test("lyric bar markers skip the remaining notes of a measure", () => {
  expect(abcToSongContent('M:3/4\nL:1/4\nK:C\nC D E | F G A |\nw:Hi | there').measures.map((measure) => measure.lyrics))
    .toEqual(["Hi * *", "there * *"]);
});
