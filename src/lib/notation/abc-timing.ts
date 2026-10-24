import type { AbcRowEvent } from "./abc-rows";

function fraction(value: string) {
  const [numerator, denominator] = value.split("/").map(Number);
  return numerator / denominator;
}

function noteLength(note: string, measureLength: number) {
  const suffix = note.startsWith("[") ? note.slice(note.indexOf("]") + 1) : note.replace(/^(?:\^\^?|__?|=)?[A-Ga-gzZxXyY][,']*/, "");
  const match = suffix.match(/^(\d*)(\/*)(\d*)(\.*)/);
  if (!match) return 1;
  const [, numerator, slashes, denominator, dots] = match;
  const base = /^(?:Z|X)/.test(note) ? measureLength : 1;
  const duration = base * Number(numerator || 1) / (slashes ? Number(denominator || 2 ** slashes.length) : 1);
  return duration * (dots ? 2 - 1 / 2 ** dots.length : 1);
}

export function eventLengths(events: AbcRowEvent[], meter: string, unitLength: string) {
  const result: number[] = [];
  let tupletRemaining = 0;
  let tupletRatio = 1;
  let brokenRatio = 1;
  const compound = Number(meter.split("/")[0]) > 3 && Number(meter.split("/")[0]) % 3 === 0;
  for (const event of events) {
    const tuplet = event.prefix.match(/\((\d+)(?::(\d*))?(?::(\d+))?/);
    if (tuplet) {
      const count = Number(tuplet[1]);
      const time = Number(tuplet[2] || ([2, 4, 8].includes(count) ? 3 : [3, 6].includes(count) ? 2 : compound ? 3 : 2));
      tupletRemaining = Number(tuplet[3] || count);
      tupletRatio = time / count;
    }
    let duration = noteLength(event.note, fraction(meter) / fraction(unitLength)) * brokenRatio;
    brokenRatio = 1;
    if (tupletRemaining > 0) {
      duration *= tupletRatio;
      tupletRemaining -= 1;
    }
    const broken = event.note.match(/([<>]+)$/)?.[1];
    if (broken) {
      const short = 1 / 2 ** broken.length;
      duration *= broken[0] === ">" ? 2 - short : short;
      brokenRatio = broken[0] === ">" ? short : 2 - short;
    }
    result.push(duration);
  }
  return result;
}

export function durationSuffix(duration: number) {
  if (Math.abs(duration - 1) < 1e-8) return "";
  // ABC uses fractions, including for split notes and tuplets.
  for (let denominator = 1; denominator <= 4096; denominator += 1) {
    const numerator = Math.round(duration * denominator);
    if (Math.abs(numerator / denominator - duration) < 1e-8) {
      return denominator === 1 ? String(numerator) : `${numerator}/${denominator}`;
    }
  }
  throw new Error("Chord duration cannot be represented in ABC");
}

