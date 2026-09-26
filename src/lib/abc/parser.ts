export type Mode = "major" | "minor" | "dorian" | "mixolydian" | "lydian" | "phrygian" | "locrian";

export type HeaderInfo = {
  title: string;
  composer?: string;
  keyRoot: string;
  keyAccidental: string;
  mode: Mode;
  meterNumerator: number;
  meterDenominator: number;
  defaultLength: number;
  tempo: number;
  bodyLines: string[];
  voiceCount: number;
};

export type Pitch = {
  step: string;
  octave: number;
  alter?: number;
  accidental?: "sharp" | "double-sharp" | "flat" | "double-flat" | "natural";
};

export type ParsedItem = {
  kind: "note" | "rest";
  duration: number;
  pitches: Pitch[];
  chord?: string;
  lyric?: string;
  tieStart?: boolean;
  tieStop?: boolean;
};

export type ParsedMeasure = {
  items: ParsedItem[];
  endBar?: string;
  leftRepeat?: boolean;
};

function fraction(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const [numerator, denominator] = value.split("/").map(Number);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return fallback;
  }
  return numerator / denominator;
}

function parseMeter(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized || normalized === "C") return { numerator: 4, denominator: 4 };
  if (normalized === "C|") return { numerator: 2, denominator: 2 };
  const match = normalized.match(/^(\d+)\s*\/\s*(\d+)/);
  if (!match) return { numerator: 4, denominator: 4 };
  return { numerator: Number(match[1]), denominator: Number(match[2]) };
}

function parseTempo(value: string | undefined) {
  const normalized = value?.trim() ?? "";
  const equalValue = normalized.match(/=\s*(\d+(?:\.\d+)?)/)?.[1];
  const plainValue = normalized.match(/\d+(?:\.\d+)?/)?.[0];
  const parsed = Number(equalValue ?? plainValue ?? 104);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 104;
}

function parseKey(value: string | undefined) {
  const normalized = value?.trim() ?? "C";
  const match = normalized.match(/^([A-Ga-g])([#b]?)([A-Za-z]*)/);
  if (!match) {
    return { root: "C", accidental: "", mode: "major" as Mode };
  }

  const suffix = match[3].toLowerCase();
  let mode: Mode = "major";
  if (suffix === "m" || suffix === "min" || suffix === "minor" || suffix === "aeo") {
    mode = "minor";
  } else if (suffix.startsWith("dor")) {
    mode = "dorian";
  } else if (suffix.startsWith("mix")) {
    mode = "mixolydian";
  } else if (suffix.startsWith("lyd")) {
    mode = "lydian";
  } else if (suffix.startsWith("phr")) {
    mode = "phrygian";
  } else if (suffix.startsWith("loc")) {
    mode = "locrian";
  }

  return {
    root: match[1].toUpperCase(),
    accidental: match[2],
    mode,
  };
}

function readHeaders(abc: string): HeaderInfo {
  const lines = abc.replaceAll("\r", "").split("\n");
  let title = "Untitled lead sheet";
  let composer: string | undefined;
  let meter: string | undefined;
  let length: string | undefined;
  let tempo: string | undefined;
  let key: string | undefined;
  let bodyStarted = false;
  const bodyLines: string[] = [];
  const voices = new Set<string>();

  for (const line of lines) {
    const field = line.match(/^([A-Z]):\s?(.*)$/);
    if (!bodyStarted && field) {
      const [, name, value] = field;
      if (name === "T" && title === "Untitled lead sheet") title = value.trim() || title;
      if (name === "C") composer = value.trim() || composer;
      if (name === "M") meter = value;
      if (name === "L") length = value;
      if (name === "Q") tempo = value;
      if (name === "K") {
        key = value;
        bodyStarted = true;
      }
      if (name === "V") voices.add(value.trim().split(/\s+/)[0] || "1");
      continue;
    }

    if (!bodyStarted && line.trim() && !line.trimStart().startsWith("%")) bodyStarted = true;
    if (bodyStarted) {
      const voiceField = line.match(/^V:\s*([^\s]+)/);
      if (voiceField) voices.add(voiceField[1]);
      bodyLines.push(line);
    }
  }

  const parsedMeter = parseMeter(meter);
  const defaultLength = fraction(length, parsedMeter.numerator >= 3 ? 1 / 8 : 1 / 16);
  const parsedKey = parseKey(key);

  return {
    title,
    composer,
    keyRoot: parsedKey.root,
    keyAccidental: parsedKey.accidental,
    mode: parsedKey.mode,
    meterNumerator: parsedMeter.numerator,
    meterDenominator: parsedMeter.denominator,
    defaultLength,
    tempo: parseTempo(tempo),
    bodyLines,
    voiceCount: voices.size,
  };
}

function readAccidental(value: string, start: number) {
  let index = start;
  let symbol = "";
  while (index < value.length && ["^", "_", "="].includes(value[index])) {
    symbol += value[index];
    index += 1;
  }

  if (!symbol) return { index, alter: undefined, accidental: undefined };
  if (symbol === "=") return { index, alter: 0, accidental: "natural" as const };
  if (symbol.startsWith("^")) {
    return {
      index,
      alter: symbol.length > 1 ? 2 : 1,
      accidental: symbol.length > 1 ? ("double-sharp" as const) : ("sharp" as const),
    };
  }
  return {
    index,
    alter: symbol.length > 1 ? -2 : -1,
    accidental: symbol.length > 1 ? ("double-flat" as const) : ("flat" as const),
  };
}

function readPitch(value: string, start: number): { pitch?: Pitch; index: number } {
  const accidental = readAccidental(value, start);
  let index = accidental.index;
  const letter = value[index];
  if (!letter || !/[A-Ga-g]/.test(letter)) return { index: start };
  index += 1;

  let octave = letter === letter.toLowerCase() ? 5 : 4;
  while (index < value.length && [",", "'"].includes(value[index])) {
    octave += value[index] === "," ? -1 : 1;
    index += 1;
  }

  return {
    index,
    pitch: {
      step: letter.toUpperCase(),
      octave,
      alter: accidental.alter,
      accidental: accidental.accidental,
    },
  };
}

function readDuration(value: string, start: number, defaultLength: number) {
  let index = start;
  let numerator = "";
  while (/\d/.test(value[index] ?? "")) {
    numerator += value[index];
    index += 1;
  }

  let slashCount = 0;
  while (value[index] === "/") {
    slashCount += 1;
    index += 1;
  }

  let denominator = "";
  while (/\d/.test(value[index] ?? "")) {
    denominator += value[index];
    index += 1;
  }

  let multiplier = numerator ? Number(numerator) : 1;
  if (slashCount > 0) {
    multiplier /= denominator ? Number(denominator) : 2 ** slashCount;
  }

  let dots = 0;
  while (value[index] === ".") {
    dots += 1;
    index += 1;
  }
  if (dots === 1) multiplier *= 1.5;
  if (dots > 1) multiplier *= 1.75;

  return { index, duration: defaultLength * 4 * multiplier };
}

function parsePitches(value: string) {
  const pitches: Pitch[] = [];
  let index = 0;
  while (index < value.length) {
    const parsed = readPitch(value, index);
    if (parsed.pitch) {
      pitches.push(parsed.pitch);
      index = parsed.index;
    } else {
      index += 1;
    }
  }
  return pitches;
}

function barTokenAt(value: string, index: number) {
  const tokens = [":|:", "::", "|]", "[|", "|:", ":|", "||", "|"];
  return tokens.find((token) => value.startsWith(token, index));
}

function parseMeasures(header: HeaderInfo) {
  const measures: ParsedMeasure[] = [];
  let current: ParsedItem[] = [];
  let pendingLeftRepeat = false;
  let activeVoice: string | undefined;
  const primaryVoice = header.bodyLines
    .map((line) => line.match(/^V:\s*([^\s]+)/)?.[1])
    .find(Boolean);
  let pendingChord: string | undefined;
  let pendingBrokenRatio = 1;
  let tieActive = false;
  const lyricTokens = header.bodyLines
    .filter((line) => /^w:/i.test(line.trim()))
    .flatMap((line) => line.trim().replace(/^w:\s*/i, "").split(/\s+/))
    .map((token) => token.replace(/[|*]$/g, "").replace(/-$/g, ""))
    .filter(Boolean);
  let lyricIndex = 0;

  const nextLyric = () => {
    const lyric = lyricTokens[lyricIndex];
    lyricIndex += 1;
    return lyric;
  };

  const finishMeasure = (bar: string) => {
    if (current.length === 0) {
      pendingLeftRepeat = pendingLeftRepeat || bar.includes("|:");
      return;
    }
    measures.push({ items: current, endBar: bar, leftRepeat: pendingLeftRepeat });
    current = [];
    pendingLeftRepeat = bar.includes("|:");
  };

  for (const rawLine of header.bodyLines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("%") || trimmed.startsWith("w:") || trimmed.startsWith("W:")) {
      continue;
    }

    const voiceField = trimmed.match(/^V:\s*([^\s]+)/);
    if (voiceField) {
      activeVoice = voiceField[1];
      continue;
    }
    if (primaryVoice && activeVoice && activeVoice !== primaryVoice) continue;

    let index = 0;
    while (index < rawLine.length) {
      const char = rawLine[index];
      if (/\s/.test(char)) {
        index += 1;
        continue;
      }
      if (char === "%") break;

      const bar = barTokenAt(rawLine, index);
      if (bar) {
        finishMeasure(bar);
        index += bar.length;
        continue;
      }

      if (char === '"') {
        const closing = rawLine.indexOf('"', index + 1);
        if (closing === -1) break;
        pendingChord = rawLine.slice(index + 1, closing);
        index = closing + 1;
        continue;
      }

      if (char === "!") {
        const closing = rawLine.indexOf("!", index + 1);
        index = closing === -1 ? rawLine.length : closing + 1;
        continue;
      }

      if (char === "+") {
        const closing = rawLine.indexOf("+", index + 1);
        index = closing === -1 ? rawLine.length : closing + 1;
        continue;
      }

      if (char === "(") {
        index += 1;
        while (/\d/.test(rawLine[index] ?? "")) index += 1;
        continue;
      }

      if (char === "[") {
        const closing = rawLine.indexOf("]", index + 1);
        if (closing === -1) {
          index += 1;
          continue;
        }
        const inside = rawLine.slice(index + 1, closing);
        if (/^(?:V|K|P):/.test(inside) || /^\d/.test(inside)) {
          index = closing + 1;
          continue;
        }
        const duration = readDuration(rawLine, closing + 1, header.defaultLength);
        const pitches = parsePitches(inside);
        if (pitches.length > 0) {
          const item: ParsedItem = {
            kind: "note",
            duration: duration.duration * pendingBrokenRatio,
            pitches,
            chord: pendingChord,
            lyric: nextLyric(),
            tieStop: tieActive,
          };
          current.push(item);
          pendingChord = undefined;
          tieActive = false;
          index = duration.index;
          if (rawLine[index] === "-") {
            item.tieStart = true;
            tieActive = true;
            index += 1;
          }
          pendingBrokenRatio = 1;
          continue;
        }
        index = closing + 1;
        continue;
      }

      const pitch = readPitch(rawLine, index);
      const isRest = ["z", "x", "s"].includes(char);
      if (pitch.pitch || isRest) {
        const afterPitch = pitch.pitch ? pitch.index : index + 1;
        const duration = readDuration(rawLine, afterPitch, header.defaultLength);
        const item: ParsedItem = {
          kind: pitch.pitch ? "note" : "rest",
          duration: duration.duration * pendingBrokenRatio,
          pitches: pitch.pitch ? [pitch.pitch] : [],
          chord: pendingChord,
          lyric: nextLyric(),
          tieStop: pitch.pitch ? tieActive : undefined,
        };
        current.push(item);
        pendingChord = undefined;
        tieActive = false;
        index = duration.index;

        if (rawLine[index] === "-") {
          item.tieStart = Boolean(pitch.pitch);
          tieActive = Boolean(pitch.pitch);
          index += 1;
        }

        if (rawLine[index] === ">" || rawLine[index] === "<") {
          const modifier = rawLine[index];
          let count = 0;
          while (rawLine[index] === modifier) {
            count += 1;
            index += 1;
          }
          const currentRatio = count > 1 ? 7 / 4 : 3 / 2;
          item.duration *= currentRatio;
          pendingBrokenRatio = 1 / currentRatio;
        } else {
          pendingBrokenRatio = 1;
        }
        continue;
      }

      index += 1;
    }
  }

  if (current.length > 0 || measures.length === 0) {
    measures.push({ items: current, leftRepeat: pendingLeftRepeat });
  }

  return measures;
}

export type ParsedAbc = {
  header: HeaderInfo;
  measures: ParsedMeasure[];
};

export function parseAbc(abc: string): ParsedAbc {
  const header = readHeaders(abc);
  return { header, measures: parseMeasures(header) };
}
