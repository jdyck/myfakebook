import { parseAbcRows, type AbcRowEvent } from "../notation/abc-rows";
import { durationSuffix, eventLengths } from "../notation/abc-timing";
import { toInlineAbc } from "../notation/abc-voices";

export type SongMeasure = {
  /** Chord name and duration in multiples of unitLength. An empty name is a gap. */
  chords: [string, number][];
  melody: string;
  lyrics: string;
};

export type SongContent = {
  meter: string;
  unitLength: string;
  measures: SongMeasure[];
};

export function sameSongContent(left: SongContent, right: SongContent) {
  return left.meter === right.meter && left.unitLength === right.unitLength
    && left.measures.length === right.measures.length
    && left.measures.every((measure, index) => {
      const other = right.measures[index];
      return measure.melody === other.melody && measure.lyrics === other.lyrics
        && measure.chords.length === other.chords.length
        && measure.chords.every(([name, duration], chordIndex) => name === other.chords[chordIndex][0] && duration === other.chords[chordIndex][1]);
    });
}

function fraction(value: string) {
  const [numerator, denominator] = value.split("/").map(Number);
  return numerator / denominator;
}

export function validateSongContent(value: unknown): asserts value is SongContent {
  if (!value || typeof value !== "object") throw new Error("Song content must be an object");
  const content = value as Record<string, unknown>;
  if (typeof content.meter !== "string" || !/^[1-9]\d*\/[1-9]\d*$/.test(content.meter)) {
    throw new Error("Meter must be a positive fraction, such as 3/4");
  }
  if (typeof content.unitLength !== "string" || !/^[1-9]\d*\/[1-9]\d*$/.test(content.unitLength)) {
    throw new Error("Unit length must be a positive fraction, such as 1/4");
  }
  if (!Number.isFinite(fraction(content.meter)) || !Number.isFinite(fraction(content.unitLength))) {
    throw new Error("Meter and unit length must be finite");
  }
  if (!Array.isArray(content.measures)) throw new Error("Measures must be an array");
  for (const measure of content.measures) {
    if (!measure || typeof measure !== "object" || typeof measure.melody !== "string" || typeof measure.lyrics !== "string" || !Array.isArray(measure.chords)) {
      throw new Error("Each measure needs chords, melody and lyrics");
    }
    if (/[\r\n]/.test(measure.melody + measure.lyrics)) {
      throw new Error("Measure melody and lyrics must each be a single line");
    }
    for (const chord of measure.chords) {
      if (!Array.isArray(chord) || chord.length !== 2 || typeof chord[0] !== "string" || /["\r\n]/.test(chord[0]) || typeof chord[1] !== "number" || !Number.isFinite(chord[1]) || chord[1] <= 0) {
        throw new Error("Each chord must be a [name, positive duration] pair");
      }
    }
  }
}

/** Read the structured content while keeping the original ABC separately for lossless editing. */
export function abcToSongContent(abc: string): SongContent {
  abc = toInlineAbc(abc);
  const meterField = abc.match(/^M:\s*(\S+)/m)?.[1] ?? "4/4";
  const meter = meterField === "C|" ? "2/2" : /^[1-9]\d*\/[1-9]\d*$/.test(meterField) && Number.isFinite(fraction(meterField)) ? meterField : "4/4";
  const lengthField = abc.match(/^L:\s*(\S+)/m)?.[1] ?? "";
  const unitLength = /^[1-9]\d*\/[1-9]\d*$/.test(lengthField) && Number.isFinite(fraction(lengthField)) ? lengthField : (fraction(meter) < 0.75 ? "1/16" : "1/8");
  const document = parseAbcRows(abc);
  const content: SongContent = { meter, unitLength, measures: [] };
  if (!document.supported) return content;
  let currentEvents: AbcRowEvent[] = [];
  let currentLyrics: string[] = [];
  let activeChord = "";

  function finishMeasure() {
    if (!currentEvents.length) return;
    const lengths = eventLengths(currentEvents, meter, unitLength);
    const chords: SongMeasure["chords"] = [];
    currentEvents.forEach((event, index) => {
      if (event.chord) activeChord = event.chord.trim();
      const duration = lengths[index];
      const previous = chords.at(-1);
      if (previous?.[0] === activeChord && !event.chord) previous[1] += duration;
      else chords.push([activeChord, duration]);
    });
    content.measures.push({
      chords: chords.some(([name]) => name) ? chords : [],
      melody: currentEvents.map((event) => `${event.prefix}${event.note}`).join(" "),
      lyrics: currentLyrics.join(" "),
    });
    currentEvents = [];
    currentLyrics = [];
  }

  for (const part of document.parts) {
    if (part.kind !== "music") continue;
    const lyrics = document.parts.find((candidate) => candidate.kind === "lyrics" && candidate.targetId === part.id);
    const tokens = lyrics?.kind === "lyrics" ? lyrics.tokens : [];
    let lyricIndex = 0;
    for (const event of part.events) {
      if (event.barBefore.trim()) {
        finishMeasure();
        if (tokens[lyricIndex] === "|") lyricIndex += 1;
      }
      currentEvents.push(event);
      if (!/^[zZxXyY]/.test(event.note) && tokens.length) {
        // A lyric bar skips the remaining notes until the next melody bar.
        currentLyrics.push(tokens[lyricIndex] === "|" ? "*" : tokens[lyricIndex++] ?? "*");
      }
    }
    if (/[|:]/.test(part.trailing.split("%")[0])) finishMeasure();
  }
  finishMeasure();
  return content;
}

function melodyWithChords(measure: SongMeasure, content: SongContent) {
  if (!measure.chords.length) return measure.melody;
  const parsed = parseAbcRows(`K:C\n${measure.melody}`);
  const events = parsed.parts.flatMap((part) => part.kind === "music" ? part.events : []);
  if (!events.length) return measure.chords.map(([name, duration]) => `"${name || " "}"z${durationSuffix(duration)}`).join(" ");
  const lengths = eventLengths(events, content.meter, content.unitLength);
  const changes: { position: number; name: string }[] = [];
  let position = 0;
  for (const [name, duration] of measure.chords) {
    changes.push({ position, name });
    position += duration;
  }
  let elapsed = 0;
  let chordIndex = 0;
  const output: string[] = [];
  events.forEach((event, index) => {
    const end = elapsed + lengths[index];
    const splits = changes.filter((change) => change.position > elapsed + 1e-8 && change.position < end - 1e-8);
    if (!splits.length) {
      let chord: string | undefined;
      while (chordIndex < changes.length && changes[chordIndex].position <= elapsed + 1e-8) {
        chord = changes[chordIndex++].name;
      }
      output.push(`${chord === undefined ? "" : `"${chord || " "}"`}${event.prefix}${event.note}`);
    } else {
      if (events.some((candidate) => /\(\d/.test(candidate.prefix)) || /[<>]/.test(event.note)) {
        throw new Error("Chord changes inside tuplets or broken rhythms need to align with a melody note");
      }
      const pitch = event.note.match(/^(?:\[(?:[^\]]+)\]|(?:\^\^?|__?|=)?[A-Ga-gzZxXyY][,']*)/)?.[0] ?? event.note;
      const boundaries = [...splits.map((split) => split.position), end];
      boundaries.forEach((boundary, splitIndex) => {
        let chord: string | undefined;
        while (chordIndex < changes.length && changes[chordIndex].position <= elapsed + 1e-8) chord = changes[chordIndex++].name;
        const tie = !/^[zZxXyY]/.test(pitch) && (boundary < end - 1e-8 || event.note.includes("-")) ? "-" : "";
        output.push(`${chord === undefined ? "" : `"${chord || " "}"`}${splitIndex === 0 ? event.prefix : ""}${pitch}${durationSuffix(boundary - elapsed)}${tie}`);
        elapsed = boundary;
      });
    }
    elapsed = end;
  });
  return [output.join(" "), ...parsed.parts.flatMap((part) => part.kind === "music" && part.trailing ? [part.trailing] : [])].join(" ");
}

function renderPreviousLayout(content: SongContent, previousAbc: string) {
  const document = parseAbcRows(previousAbc);
  if (!document.supported) return;
  const previous = abcToSongContent(previousAbc);
  if (previous.measures.length !== content.measures.length) return;
  const lines = previousAbc.split("\n").slice(document.header.length);
  const ranges = new Map<string, { start: number; end: number }>();
  const body: string[] = [];
  let cursor = 0;
  const musicParts = document.parts.filter((part) => part.kind === "music");
  for (const [partIndex, part] of document.parts.entries()) {
    if (part.kind === "raw") {
      body.push(part.text);
      continue;
    }
    if (part.kind === "lyrics") {
      const range = ranges.get(part.targetId);
      if (!range) return;
      const measures = content.measures.slice(range.start, range.end);
      const unchanged = measures.every((measure, index) => measure.lyrics === previous.measures[range.start + index].lyrics);
      body.push(unchanged ? lines[partIndex] : `${part.prefix} ${measures.map((measure) => measure.lyrics).join(" | ")}`);
      continue;
    }
    // Preserve the original row layout when its measures end on the row.
    if (!/[|:]/.test(part.trailing.split("%")[0]) && part !== musicParts.at(-1)) return;
    const groups = part.events.filter((event, index) => index === 0 || event.barBefore.trim());
    const start = cursor;
    cursor += groups.length;
    if (cursor > content.measures.length) return;
    ranges.set(part.id, { start, end: cursor });
    const measures = content.measures.slice(start, cursor);
    const unchanged = sameSongContent(
      { ...content, measures: measures.map((measure) => ({ ...measure, lyrics: "" })) },
      { ...content, measures: previous.measures.slice(start, cursor).map((measure) => ({ ...measure, lyrics: "" })) },
    );
    body.push(unchanged ? lines[partIndex] : measures.map((measure, index) => {
      const before = index === 0 ? groups[0].barBefore : "";
      const after = index + 1 < groups.length ? groups[index + 1].barBefore : part.trailing;
      return `${before}${melodyWithChords(measure, content)} ${after}`.trim();
    }).join(" "));
    if (!document.parts.some((candidate) => candidate.kind === "lyrics" && candidate.targetId === part.id) && measures.some((measure) => measure.lyrics)) {
      body.push(`w:${measures.map((measure) => measure.lyrics).join(" | ")}`);
    }
  }
  return cursor === content.measures.length ? body : undefined;
}

/** Generate the ABC view used by notation, playback and exports. */
export function songContentToAbc(content: SongContent, title: string, previousAbc = "") {
  validateSongContent(content);
  previousAbc = toInlineAbc(previousAbc);
  const keyIndex = previousAbc.split("\n").findIndex((line) => /^K:/.test(line));
  const header = keyIndex >= 0 ? previousAbc.split("\n").slice(0, keyIndex + 1) : ["X:1", "K:C"];
  const otherHeaders = header.filter((line) => !/^[TML]:/.test(line));
  const key = otherHeaders.pop() ?? "K:C";
  const body = renderPreviousLayout(content, previousAbc) ?? content.measures.flatMap((measure) => [
    `${melodyWithChords(measure, content)} |`,
    ...(measure.lyrics ? [`w:${measure.lyrics}`] : []),
  ]);
  return [...otherHeaders, `T:${title.replace(/[\r\n]/g, " ")}`, `M:${content.meter}`, `L:${content.unitLength}`, key, ...body].join("\n");
}
