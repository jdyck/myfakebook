export type AbcRowEvent = {
  id: string;
  barBefore: string;
  prefix: string;
  chord: string;
  note: string;
};

export type AbcRowMusicPart = {
  kind: "music";
  id: string;
  events: AbcRowEvent[];
  trailing: string;
};

export type AbcRowLyricsPart = {
  kind: "lyrics";
  id: string;
  targetId: string;
  prefix: string;
  tokens: string[];
};

export type AbcRowRawPart = {
  kind: "raw";
  text: string;
};

export type AbcRowPart = AbcRowMusicPart | AbcRowLyricsPart | AbcRowRawPart;

export type AbcRowDocument = {
  header: string[];
  parts: AbcRowPart[];
  supported: boolean;
  reason?: string;
};

const BAR_TOKENS = [":|:", "::", "|]", "[|", "|:", ":|", "||", "|"];

export function splitLyricSyllables(word: string) {
  const syllables: string[] = [];
  let syllableStart = 0;
  for (let index = 0; index < word.length; index += 1) {
    if (word[index] !== "-" || index === syllableStart || word[index - 1] === "\\") continue;
    syllables.push(word.slice(syllableStart, index + 1));
    syllableStart = index + 1;
  }
  if (syllableStart < word.length) syllables.push(word.slice(syllableStart));
  return syllables.length ? syllables : [word];
}

function lyricTokens(value: string) {
  const content = value.trim();
  return content ? content.split(/\s+/).flatMap(splitLyricSyllables) : [];
}

function parseMusicLine(line: string, id: string): AbcRowMusicPart | null {
  const events: AbcRowEvent[] = [];
  let index = 0;
  let eventNumber = 0;
  let barBefore = "";
  let prefix = "";
  let chord = "";
  let trailing = "";

  while (index < line.length) {
    const char = line[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (char === "%") {
      trailing = line.slice(index);
      break;
    }

    const bar = BAR_TOKENS.find((token) => line.startsWith(token, index));
    if (bar) {
      barBefore += `${bar} `;
      index += bar.length;
      continue;
    }

    if (char === '"') {
      const closing = line.indexOf('"', index + 1);
      if (closing === -1) {
        trailing = line.slice(index);
        break;
      }
      chord = line.slice(index + 1, closing);
      index = closing + 1;
      continue;
    }

    if (char === "!" || char === "+") {
      const closing = line.indexOf(char, index + 1);
      if (closing === -1) {
        prefix += line.slice(index);
        break;
      }
      prefix += line.slice(index, closing + 1);
      index = closing + 1;
      continue;
    }

    if (char === "{") {
      const closing = line.indexOf("}", index + 1);
      if (closing === -1) {
        prefix += line.slice(index);
        break;
      }
      prefix += line.slice(index, closing + 1);
      index = closing + 1;
      continue;
    }

    const tuplet = line.slice(index).match(/^\(\d+(?::\d+)?(?::\d+)?/);
    if (tuplet) {
      prefix += tuplet[0];
      index += tuplet[0].length;
      continue;
    }

    if (char === "[") {
      const noteCluster = line.slice(index).match(/^\[(?:[\^_=]*[A-Ga-g][,']*)+\](?:\d+)?(?:\/+\d*)?(?:\.{1,2})?(?:[-~])?(?:[><]+)?/);
      if (noteCluster) {
        events.push({
          id: `${id}-event-${eventNumber++}`,
          barBefore,
          prefix,
          chord,
          note: noteCluster[0],
        });
        barBefore = "";
        prefix = "";
        chord = "";
        index += noteCluster[0].length;
        continue;
      }

      const closing = line.indexOf("]", index + 1);
      if (closing !== -1) {
        prefix += line.slice(index, closing + 1);
        index = closing + 1;
        continue;
      }
    }

    const note = line.slice(index).match(/^(?:\^\^?|__?|=)?[A-Ga-g][,']*(?:\d+)?(?:\/+\d*)?(?:\.{1,2})?(?:[-~])?(?:[><]+)?/)
      ?? line.slice(index).match(/^[zZxXyY](?:\d+)?(?:\/+\d*)?(?:\.{1,2})?/);
    if (note) {
      events.push({
        id: `${id}-event-${eventNumber++}`,
        barBefore,
        prefix,
        chord,
        note: note[0],
      });
      barBefore = "";
      prefix = "";
      chord = "";
      index += note[0].length;
      continue;
    }

    prefix += char;
    index += 1;
  }

  if (events.length === 0) return null;
  trailing = `${barBefore}${prefix}${chord ? `"${chord}"` : ""}${trailing}`;
  return { kind: "music", id, events, trailing };
}

export function parseAbcRows(abc: string): AbcRowDocument {
  const lines = abc.replaceAll("\r", "").split("\n");
  const keyIndex = lines.findIndex((line) => /^K\s*:/i.test(line));
  if (keyIndex === -1) {
    return { header: [], parts: [], supported: false, reason: "This source needs a K: key field before the music." };
  }

  const header = lines.slice(0, keyIndex + 1);
  const bodyLines = lines.slice(keyIndex + 1);
  const voices = new Set(bodyLines.flatMap((line) => {
    const match = line.match(/^V\s*:\s*([^\s]+)/i);
    return match ? [match[1]] : [];
  }));
  if (voices.size > 1 || bodyLines.some((line) => /\[V\s*:/i.test(line))) {
    return {
      header,
      parts: bodyLines.map((text) => ({ kind: "raw", text })),
      supported: false,
      reason: "This source has multiple voices. Edit it in the Source tab to keep every part intact.",
    };
  }

  const parts: AbcRowPart[] = [];
  let lastMusicId: string | null = null;
  let musicNumber = 0;
  let lyricNumber = 0;

  bodyLines.forEach((line) => {
    const lyric = line.match(/^(\s*[wW]:\s?)(.*)$/);
    if (lyric) {
      if (!lastMusicId) {
        parts.push({ kind: "raw", text: line });
        return;
      }
      const tokens = lyricTokens(lyric[2]);
      parts.push({
        kind: "lyrics",
        id: `lyrics-${lyricNumber++}`,
        targetId: lastMusicId,
        prefix: lyric[1].trimEnd(),
        tokens,
      });
      return;
    }

    if (/^\s*[A-Z]\s*:/i.test(line) || /^\s*%/.test(line) || !line.trim()) {
      parts.push({ kind: "raw", text: line });
      return;
    }

    const music = parseMusicLine(line, `music-${musicNumber++}`);
    if (music) {
      parts.push(music);
      lastMusicId = music.id;
    } else {
      parts.push({ kind: "raw", text: line });
    }
  });

  if (!parts.some((part) => part.kind === "music")) {
    return {
      header,
      parts,
      supported: false,
      reason: "No melody notes were found after the K: key field.",
    };
  }

  return { header, parts, supported: true };
}

function serializeMusicPart(part: AbcRowMusicPart) {
  const output: string[] = [];
  let pending = "";

  for (const event of part.events) {
    if (!event.note.trim()) {
      pending = [pending, event.barBefore, event.prefix, event.chord ? `"${event.chord}"` : ""]
        .filter(Boolean)
        .join(" ");
      continue;
    }

    const chord = event.chord.trim() ? `"${event.chord.trim().replaceAll('"', '\\"')}"` : "";
    output.push([pending, event.barBefore, event.prefix, chord, event.note.trim()].filter(Boolean).join(" "));
    pending = "";
  }

  const result = [output.join(" "), pending, part.trailing].filter(Boolean).join(" ");
  return result;
}

export function serializeAbcRows(document: AbcRowDocument) {
  const body = document.parts.map((part) => {
    if (part.kind === "raw") return part.text;
    if (part.kind === "music") return serializeMusicPart(part);
    const lyricLine = part.tokens.map((token) => token.trim() || "*").join(" ");
    return `${part.prefix.trimEnd()}${lyricLine ? ` ${lyricLine}` : ""}`;
  });
  return [...document.header, ...body].join("\n");
}

export function formatAbcRows(document: AbcRowDocument) {
  const musicParts = document.parts.filter((part): part is AbcRowMusicPart => part.kind === "music");
  return musicParts.map((music) => {
    const lyricParts = document.parts.filter(
      (part): part is AbcRowLyricsPart => part.kind === "lyrics" && part.targetId === music.id,
    );
    const rows = Array.from({ length: lyricParts.length + 2 }, () => "");
    music.events.forEach((event, eventIndex) => {
      const bars = event.barBefore.trim().split(/\s+/).filter(Boolean);
      for (const bar of bars) {
        rows[0] += " ".repeat(bar.length + 1);
        rows[1] += `${bar} `;
        for (let lyricIndex = 0; lyricIndex < lyricParts.length; lyricIndex += 1) {
          rows[lyricIndex + 2] += " ".repeat(bar.length + 1);
        }
      }

      const melody = `${event.prefix}${event.note}` || ".";
      const values = [event.chord, melody, ...lyricParts.map((lyrics) => lyrics.tokens[eventIndex] ?? "")];
      const cellWidth = Math.max(1, ...values.map((value) => value.length));
      values.forEach((value, rowIndex) => {
        rows[rowIndex] += `${value.padEnd(cellWidth)} `;
      });
    });

    lyricParts.forEach((lyrics, lyricIndex) => {
      const overflow = lyrics.tokens.slice(music.events.length);
      if (overflow.length) rows[lyricIndex + 2] += overflow.join(" ");
    });
    if (music.trailing) rows[1] += music.trailing;

    const formattedRows = rows.map((row) => row.trimEnd());
    return formattedRows.join("\n");
  }).join("\n\n");
}

type LaneCell = { barBefore: string; value: string; alignmentStart: number };

function parseLane(value: string): LaneCell[] {
  const tokenPattern = /"(?:\\.|[^"])*"|:\|:|::|\|\]|\[\||\|:|:\||\|\||\||[^\s|]+/g;
  const barTokens = new Set(BAR_TOKENS);
  const cells: LaneCell[] = [];
  let barBefore = "";
  let barStart: number | null = null;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(value))) {
    const token = match[0];
    if (barTokens.has(token)) {
      barStart ??= match.index;
      barBefore += `${token} `;
      continue;
    }

    let cellValue = token;
    if (token.startsWith('"') && token.endsWith('"')) {
      try {
        const parsed: unknown = JSON.parse(token);
        if (typeof parsed === "string") cellValue = parsed;
      } catch {
        cellValue = token.slice(1, -1).replaceAll('\\"', '"');
      }
    }
    cells.push({
      barBefore,
      value: cellValue,
      alignmentStart: barStart ?? match.index,
    });
    barBefore = "";
    barStart = null;
  }

  return cells;
}

function parseAlignedLane(
  value: string,
  melodyCells: LaneCell[],
  blankMarkers: ReadonlySet<string> = new Set(),
  tokenLimit = Number.POSITIVE_INFINITY,
) {
  const aligned = melodyCells.map(() => "");
  if (melodyCells.length === 0) return aligned;

  let tokenIndex = 0;
  for (const match of value.matchAll(/\S+/g)) {
    const token = match[0];
    if (tokenIndex++ >= tokenLimit) continue;
    if (blankMarkers.has(token)) continue;
    const tokenStart = match.index ?? 0;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    melodyCells.forEach((cell, index) => {
      const distance = Math.abs(cell.alignmentStart - tokenStart);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    aligned[nearestIndex] = token;
  }

  return aligned;
}

export function parseAbcRowText(value: string, template: AbcRowDocument): AbcRowDocument | null {
  if (!template.supported) return null;
  const musicParts = template.parts.filter((part): part is AbcRowMusicPart => part.kind === "music");
  if (musicParts.length === 0) return null;

  const lines = value.replaceAll("\r", "").split("\n");
  const rowsPerMusicPart = musicParts.map((music) => {
    const lyricCount = template.parts.filter((part) => part.kind === "lyrics" && part.targetId === music.id).length;
    return lyricCount + 2;
  });
  const expectedLineCount = rowsPerMusicPart.reduce((total, count) => total + count, 0) + musicParts.length - 1;

  while (lines.length > expectedLineCount && lines.at(-1) === "") lines.pop();
  if (lines.length !== expectedLineCount) return null;

  const groups: string[][] = [];
  let lineIndex = 0;
  for (const [groupIndex, rowCount] of rowsPerMusicPart.entries()) {
    groups.push(lines.slice(lineIndex, lineIndex + rowCount));
    lineIndex += rowCount;

    if (groupIndex < rowsPerMusicPart.length - 1) {
      if (!/^[ \t]*$/.test(lines[lineIndex] ?? "")) return null;
      lineIndex += 1;
    }
  }
  if (lineIndex !== lines.length) return null;

  const musicUpdates = new Map<string, AbcRowMusicPart>();
  const lyricUpdates = new Map<string, AbcRowLyricsPart>();

  for (const [groupIndex, group] of groups.entries()) {
    const music = musicParts[groupIndex];
    const rows = group;
    const lyricParts = template.parts.filter(
      (part): part is AbcRowLyricsPart => part.kind === "lyrics" && part.targetId === music.id,
    );
    if (rows.length !== lyricParts.length + 2) return null;

    const melodyCells = parseLane(rows[1]);
    const chordValues = parseAlignedLane(rows[0], melodyCells, new Set(["_", "."]));
    const events = melodyCells.map((cell, eventIndex) => {
      const previous = music.events[eventIndex];
      const value = cell.value === "." ? "" : cell.value;
      const prefix = previous?.prefix ?? "";
      const note = value.startsWith(prefix) ? value.slice(prefix.length) : value;
      return {
        id: previous?.id ?? `${music.id}-row-event-${eventIndex}`,
        barBefore: cell.barBefore,
        prefix,
        chord: chordValues[eventIndex],
        note,
      };
    });
    musicUpdates.set(music.id, { ...music, events });

    lyricParts.forEach((lyrics, lyricIndex) => {
      const lyricRow = rows[lyricIndex + 2];
      const lyricTokensInRow = Array.from(lyricRow.matchAll(/\S+/g), (match) => match[0]);
      const alignedLyrics = parseAlignedLane(lyricRow, melodyCells, new Set(["."]), melodyCells.length);
      const lyricValues = alignedLyrics.flatMap((token) => token ? lyricTokens(token) : [""]);
      lyricValues.push(...lyricTokens(lyricTokensInRow.slice(melodyCells.length).join(" ")));
      lyricUpdates.set(lyrics.id, {
        ...lyrics,
        tokens: lyricValues,
      });
    });
  }

  return {
    ...template,
    parts: template.parts.map((part) => {
      if (part.kind === "music") return musicUpdates.get(part.id) ?? part;
      if (part.kind === "lyrics") return lyricUpdates.get(part.id) ?? part;
      return part;
    }),
  };
}
