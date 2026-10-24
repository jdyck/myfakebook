import { expect, test } from "vitest";
import ABCJS from "abcjs";
import { toInlineAbc, toSeparateAbc } from "./abc-voices";
import { abcToSongContent } from "../songs/song-content";

export const BLACKBIRD = `X:1
T:Bye Bye Blackbird
M:4/4
L:1/4
C:Ray Henderson
Q:1/4=160
%%staves (chords melody)
K:F
%%text (medium)
P:A
V:chords
"F6"y4 | "Gm7"x2 "C7"x2 | "F6"x2 x2 | "Gm7"x2 "C7"x2 |
"F6"x2 x2 | "Abdim7"x2 x2 | "Gm7"x2 "C7"x2 | x2 "(D7)"x2 ||
V:melody
AAAA | BAA2 | AGG2 | GFF2 |
w:Pack up all my care and woe, here I go sing-ing low,
F4 | G4 | F2E2- | E4 ||
w:bye bye Black-bird. *
P:A
V:chords
"Gm7"x2 x2 | x2 x2 | x2 x2 | x2 x2 |
"Gm7"x2 x2 | "C7"x2 x2 | "F6"x2 x2 | x2 x2 ||
V:melody
BBBB | cBB2 | BAA2 | AGG2 |
w:Where some-bod-y waits for me, sug-ar's sweet so is she,
G4 | A4 | G2F2- | F4 ||
w:bye bye Black-bird. *
P:B
V:chords
"Cm7"x2 x2 | x2 x2 | "Am7b5"x2 x2 | "D7"x2 x2 |
"Gm7"x2 x2 | x2 x2 | "( Db7 )" "Bbm7"x2 x2 | "C7"x2 x2 ||
V:melody
Fccc | cBAG | G4 | ^F4 |
w:No one here can love and un-der-stand me,
DBBB | BAGF | F4 | E4 ||
w:oh, what hard luck sto-ries they all hand me.
P:A
V:chords
"F6"x2 x2 | x2 x2 | "Gm7"x2 "C7"x2 | "Am7b5"x2 "D7"x2 |
"Gm7"x2 x2 | "C7"x2 x2 | "F6"x2 x2 | "T.A."x2 x2 |]
V:melody
AAAA | BAA2 | AGG2 | G^FF2 |
w:Make my bed and light the light I'll ar-rive late to-night,
G2B2- | B2E2 | F2z2 | z4 |]
w:Black-bird * bye bye.`;

test("the supplied chart becomes one melody with inline chords for preview", () => {
  const inline = toInlineAbc(BLACKBIRD);
  expect(inline).not.toMatch(/^V:|^%%staves/m);
  expect(inline).toContain('"F6"AAAA | "Gm7"BA"C7"A2');
  expect(inline).toContain('"( Db7 )" "Bbm7"F4');
  expect(inline.match(/^P:.*$/gm)).toEqual(["P:A", "P:A", "P:B", "P:A"]);
  expect(inline.match(/^w:.*$/gm)).toEqual(BLACKBIRD.match(/^w:.*$/gm));
  expect(inline).toContain("Q:1/4=160");
  expect(inline).toContain("K:F");
  expect(inline.replace(/"[^"\n]*"/g, "")).toContain("G^FF2");
  expect(inline).toContain("|]");
  expect(abcToSongContent(inline).measures).toHaveLength(32);
  expect(abcToSongContent(BLACKBIRD)).toEqual(abcToSongContent(inline));
  const tune = ABCJS.parseOnly(inline)[0];
  expect(tune.warnings).toBeUndefined();
  expect(tune.lines.flatMap((line) => line.staff ?? []).every((staff) => staff.voices?.length === 1)).toBe(true);
});

test("switching from inline to separate and back preserves the score", () => {
  const inline = toInlineAbc(BLACKBIRD);
  const separate = toSeparateAbc(inline);
  expect(separate).toContain("%%staves (chords melody)");
  expect(separate).toContain("V:chords");
  expect(separate).toContain("V:melody");
  expect(toInlineAbc(separate).replace(/ +/g, " ")).toBe(inline.replace(/ +/g, " "));
});

test("edits to the chord voice change the inline source and stored object", () => {
  const inline = toInlineAbc(BLACKBIRD.replace('"F6"y4', '"Fmaj7"x4'));
  expect(inline).toContain('"Fmaj7"AAAA');
  expect(abcToSongContent(inline).measures[0].chords).toEqual([["Fmaj7", 4]]);
});

test("chord changes inside held melody notes split and tie those notes", () => {
  const source = 'M:4/4\nL:1/4\nK:C\nV:chords\n"C"x2 "G7"x2 |\nV:melody\nC4 |\nw:Hi';
  expect(toInlineAbc(source)).toContain('"C"C2- "G7"C2 |\nw:Hi');
});

test("chord timing spans line breaks independently of melody line breaks", () => {
  const source = 'M:4/4\nL:1/4\nK:C\nV:chords\n"C"x4 |\n"G"x4 |\nV:melody\nCDEF | GABc |';
  expect(toInlineAbc(source)).toContain('"C"CDEF | "G"GABc |');
});

test("unequal or incomplete voices report an error instead of replacing preview", () => {
  expect(() => toInlineAbc('K:C\nV:chords\n"C"x4 |\nV:melody\nC2 |')).toThrow("same total duration");
  expect(() => toInlineAbc('K:C\nV:chords\nx4 |')).toThrow("both V:chords and V:melody");
});

test("empty songs and unchorded melodies support separate parts", () => {
  expect(toInlineAbc(toSeparateAbc("X:1\nK:C"))).toBe("X:1\nK:C");
  expect(toInlineAbc(toSeparateAbc("K:C\nCDEF |\nw:one two three four"))).toBe("K:C\nCDEF |\nw:one two three four");
});

test("JSON chord edits preserve the chart's sections, lyrics and ending barlines", async () => {
  const { songContentToAbc } = await import("../songs/song-content");
  const inline = toInlineAbc(BLACKBIRD);
  const content = abcToSongContent(inline);
  content.measures[0].chords[0][0] = "Fmaj7";
  const next = songContentToAbc(content, "Bye Bye Blackbird", inline);
  expect(next.match(/^P:.*$/gm)).toEqual(["P:A", "P:A", "P:B", "P:A"]);
  expect(next.match(/^w:.*$/gm)).toEqual(inline.match(/^w:.*$/gm));
  expect(next).toContain("|]");
  expect(next).toContain('"Fmaj7"');
  expect(abcToSongContent(next)).toEqual(content);
});
