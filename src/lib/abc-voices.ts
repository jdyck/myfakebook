import { parseAbcRows, type AbcRowMusicPart } from "./abc-rows";
import { durationSuffix, eventLengths } from "./abc-timing";

const QUOTES = /"(?:\\.|[^"\\])*"/g;
const BARS = /:\|:|::|\|\]|\[\||\|:|:\||\|\||\|/g;
const EPSILON = 1e-8;
type ChordChange = { time: number; text: string };

function musicLine(line: string): AbcRowMusicPart | undefined {
  if (!line.trim() || /^\s*(?:%|[A-Za-z]:)/.test(line)) return;
  return parseAbcRows(`K:C\n${line}`).parts.find((part): part is AbcRowMusicPart => part.kind === "music");
}

function timing(abc: string) {
  const meterField = abc.match(/^M:[ \t]*(\S+)/m)?.[1] ?? "4/4";
  const meter = meterField === "C|" ? "2/2" : meterField === "C" ? "4/4" : meterField;
  const [n, d] = meter.split("/").map(Number);
  const unitLength = abc.match(/^L:[ \t]*(\S+)/m)?.[1] ?? (n / d < 0.75 ? "1/16" : "1/8");
  return { meter, unitLength };
}

function lineEvents(line: string, part: AbcRowMusicPart, meter: string, unitLength: string) {
  const lengths = eventLengths(part.events, meter, unitLength);
  let previousEnd = 0;
  return part.events.map((event, index) => {
    const start = event.sourceStart!;
    const end = event.sourceEnd!;
    const quotes = line.slice(previousEnd, start).match(QUOTES)?.join(" ") ?? "";
    previousEnd = end;
    const duration = lengths[index];
    if (!Number.isFinite(duration) || duration <= 0) throw new Error("Use positive note and spacer durations in both parts.");
    return { event, start, end, quotes, duration };
  });
}

function stripVoiceLayout(line: string) {
  return /^\s*(?:%%(?:staves|score)\b|V:)/.test(line);
}

/** Combine the named chord and melody voices into the single source used by preview. */
export function toInlineAbc(source: string): string {
  if (!/^V:[ \t]*chords\b/m.test(source) && !/^V:[ \t]*melody\b/m.test(source)) return source;
  const lines = source.replaceAll("\r", "").split("\n");
  const keyIndex = lines.findIndex((line) => /^K:/.test(line));
  if (keyIndex < 0) throw new Error("Add a K: key field before the chord and melody parts.");
  const { meter, unitLength } = timing(source);
  const changes: ChordChange[] = [];
  const melody: { line: string; time: number }[] = [];
  let voice = "";
  let chordTime = 0;
  let melodyTime = 0;
  const voices = new Set<string>();
  for (const line of lines.slice(keyIndex + 1)) {
    const field = line.match(/^V:[ \t]*(\S+)/);
    if (field) {
      voice = field[1];
      voices.add(voice);
      if (voice !== "chords" && voice !== "melody") throw new Error("Use V:chords and V:melody for the two parts.");
      continue;
    }
    if (stripVoiceLayout(line)) continue;
    const part = musicLine(line);
    if (part) {
      if (!voice) throw new Error("Choose V:chords or V:melody before the music.");
      const events = lineEvents(line, part, meter, unitLength);
      if (voice === "chords") {
        for (const { quotes, duration } of events) {
          if (quotes) changes.push({ time: chordTime, text: quotes });
          chordTime += duration;
        }
      } else {
        melody.push({ line, time: melodyTime });
        melodyTime += events.reduce((sum, event) => sum + event.duration, 0);
      }
    } else if (!/^[wW]:/.test(line) || voice === "melody") {
      melody.push({ line, time: melodyTime });
    }
  }
  if (voices.size !== 2) throw new Error("Include both V:chords and V:melody.");
  if (Math.abs(chordTime - melodyTime) > EPSILON) throw new Error("The chord and melody parts must have the same total duration. Use x spacers to fill gaps.");
  const body = melody.map(({ line, time }) => mergeLine(line, time, changes, meter, unitLength));
  return [...lines.slice(0, keyIndex + 1).filter((line) => !stripVoiceLayout(line)), ...body].join("\n");
}

function mergeLine(line: string, time: number, changes: ChordChange[], meter: string, unitLength: string) {
  const part = musicLine(line);
  if (!part) return line;
  const edits: { start: number; end: number; text: string }[] = [];
  for (const { event, start, end, duration } of lineEvents(line, part, meter, unitLength)) {
    const until = time + duration;
    const atStart = changes.filter((change) => Math.abs(change.time - time) < EPSILON).map((change) => change.text).join(" ");
    const inside = changes.filter((change) => change.time > time + EPSILON && change.time < until - EPSILON);
    if (!inside.length) {
      if (atStart) edits.push({ start, end: start, text: atStart });
    } else {
      if (part.events.some((candidate) => /\(\d/.test(candidate.prefix)) || /[<>]/.test(event.note)) {
        throw new Error("Place chord changes on melody note boundaries inside tuplets and broken rhythms.");
      }
      const pitch = event.note.match(/^(?:\[[^\]]+\]|(?:\^\^?|__?|=)?[A-Ga-gzZxXyY][,']*)/)?.[0];
      if (!pitch) throw new Error("This melody note cannot be split at a chord change.");
      let position = time;
      let label = atStart;
      const notes = [...inside, { time: until, text: "" }].map((change) => {
        const tie = !/^[zZxXyY]/.test(pitch) && (change.time < until - EPSILON || event.note.includes("-")) ? "-" : "";
        const note = `${label}${pitch}${durationSuffix(change.time - position)}${tie}`;
        position = change.time;
        label = change.text;
        return note;
      });
      edits.push({ start, end, text: notes.join(" ") });
    }
    time = until;
  }
  for (const edit of edits.reverse()) line = line.slice(0, edit.start) + edit.text + line.slice(edit.end);
  return line;
}

function harmonyLine(line: string, part: AbcRowMusicPart, meter: string, unitLength: string) {
  const output: string[] = [];
  let duration = 0;
  let label = "";
  function flush() {
    if (duration > EPSILON) output.push(`${label}x${durationSuffix(duration)}`);
    duration = 0;
    label = "";
  }
  for (const { event, quotes, duration: length } of lineEvents(line, part, meter, unitLength)) {
    if (event.barBefore.trim()) {
      flush();
      output.push(event.barBefore.trim());
    }
    if (quotes) {
      flush();
      label = quotes;
    }
    duration += length;
  }
  flush();
  output.push(...(part.trailing.split("%")[0].match(BARS) ?? []));
  return output.join(" ");
}

/** Present inline ABC as editable, independently timed chords and melody voices. */
export function toSeparateAbc(source: string): string {
  source = toInlineAbc(source);
  const lines = source.replaceAll("\r", "").split("\n");
  const keyIndex = lines.findIndex((line) => /^K:/.test(line));
  if (keyIndex < 0) throw new Error("Add a K: key field before using separate parts.");
  if (/^V:/m.test(source) || /\[V:/.test(source)) throw new Error("Separate parts support a single melody voice.");
  const { meter, unitLength } = timing(source);
  const header = lines.slice(0, keyIndex).filter((line) => !stripVoiceLayout(line));
  const output = [...header, "%%staves (chords melody)", lines[keyIndex]];
  let chords: string[] = [];
  let melody: string[] = [];
  function flush() {
    if (chords.length) output.push("V:chords", ...chords, "V:melody", ...melody);
    chords = [];
    melody = [];
  }
  for (const line of lines.slice(keyIndex + 1)) {
    const part = musicLine(line);
    if (part) {
      chords.push(harmonyLine(line, part, meter, unitLength));
      melody.push(line.replace(QUOTES, ""));
    } else if (/^[wW]:/.test(line) && chords.length) {
      melody.push(line);
    } else {
      flush();
      output.push(line);
    }
  }
  flush();
  if (!/^V:chords$/m.test(output.join("\n"))) output.push("V:chords", "V:melody");
  return output.join("\n");
}
