export type PublicSong = {
  id: string;
  title: string;
  writers: string;
  rhythm: string;
  abc: string;
};

export const PUBLIC_LIBRARY: readonly PublicSong[] = [
  {
    id: "oh-lady-be-good",
    title: "Oh, Lady Be Good!",
    writers: "George Gershwin / Ira Gershwin",
    rhythm: "Swing",
    abc: `X:1
T:Oh, Lady Be Good!
C:George Gershwin / Ira Gershwin
R:(Swing)
M:4/4
L:1/4
K:G
"G" d2 "D7"c "G"B | "C7" d2d2 | "G" (3dBG D2-| D2 "G#o" d2 |
w:Oh, sweet and love-ly la-dy, be good!* Oh
"D7" (3dcA D2-| D2 B2| "G" G4-| G3 z ||
w:la-dy be good* to me!*
d2 "D7"c "G"B | "C7" d2d2 | "G" (3dBG D2-| D2  "G#o" d2 |
w:I am so aw-f'ly mis-un-der-stood,* so
"D7" (3dcA D2-| D2 B2| "G" G4-| G2 "G7"z2 ||
w:la-dy be good* to me!*
"C" e4| "D7"z eee | "C" e2  "G"d2-| d2 "D7"z2|
w:Oh, please have some pit-y,*
"Em"z B"B+"BB| "Em"BB"A7"BB | "Am7" B2 "D7"A2 | "Bm"z B "Am7"c "A7b5"^c||
w:I'm all a-lone in this big cit-y. I tell you
"G" d2 "D7"c "G"B | "C7" d2d2 | "G" (3dBG D2-| D2 "G#o" d2 |
w:I'm just a lone-some babe in the wood,* so
"D7" (3dcA D2-| D2 B2| "G" G4- "(D7"y2| "Am7"G2 "D7)"z2 |]
w:la-dy be good* to me!*`,
  },
];
