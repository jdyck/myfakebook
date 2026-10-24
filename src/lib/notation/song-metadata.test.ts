import { describe, expect, it } from "vitest";
import { concertKeyLabel, getSongMetadata } from "./song-metadata";

describe("song workspace metadata", () => {
  it("reads composers, rhythm, and meter without interpreting body fields as metadata", () => {
    expect(getSongMetadata("T:Song\nC:First writer\nC:Second writer\nR:(Swing)\nM:3/4\nK:G\nC:Not a writer\nG A B|")).toEqual({
      writers: "First writer / Second writer", rhythm: "Swing", meter: "3/4", key: "G", keyLabel: "G major",
    });
  });
  it("follows transposition while preserving minor keys", () => {
    expect(getSongMetadata("T:Song\nK:Am\nA B c|", 2).keyLabel).toBe("B minor");
    expect(concertKeyLabel("Bb")).toBe("B♭ major");
    expect(concertKeyLabel("F#minor")).toBe("F♯ minor");
    expect(concertKeyLabel("Ddor")).toBe("Ddor");
  });
  it("does not invent a composer or rhythm when those fields are absent", () => {
    expect(getSongMetadata("K:C\nC D E|")).toMatchObject({ writers: "", rhythm: "", meter: "4/4", keyLabel: "C major" });
  });
});
