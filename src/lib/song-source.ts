import { toInlineAbc, toSeparateAbc } from "./abc-voices";
import { abcToSongContent, sameSongContent, songContentToAbc, validateSongContent, type SongContent } from "./song-content";

export type SongSource = { content: SongContent; abc: string; abcParts: string };
export type SongSourceInput = { title: string; content?: unknown; abc?: string | null; abcParts?: string | null };

/** The object is authoritative; older records fall back to inline ABC, then separate ABC. */
export function resolveSongSource(input: SongSourceInput, previousAbc = ""): SongSource {
  let content: SongContent | undefined;
  if (input.content && typeof input.content === "object" && Object.keys(input.content).length) {
    validateSongContent(input.content);
    content = input.content;
  }
  let storedInline = "";
  try {
    storedInline = input.abc?.trim() ? toInlineAbc(input.abc) : "";
  } catch (error) {
    if (!content?.measures.length) throw error;
  }
  let abc: string;
  if (content?.measures.length) {
    let template = storedInline || previousAbc;
    if (!template && input.abcParts?.trim()) {
      try { template = toInlineAbc(input.abcParts); } catch { /* The object takes priority over stale parts. */ }
    }
    abc = template && sameSongContent(content, abcToSongContent(template))
      ? template
      : songContentToAbc(content, input.title, template);
  } else if (storedInline) {
    abc = storedInline;
    content = abcToSongContent(abc);
  } else if (input.abcParts?.trim()) {
    abc = toInlineAbc(input.abcParts);
    content = abcToSongContent(abc);
  } else {
    content ??= { meter: "4/4", unitLength: "1/8", measures: [] };
    abc = songContentToAbc(content, input.title, previousAbc);
  }
  // Preserve the editable parts source when it still describes the current object.
  let abcParts: string | undefined;
  if (input.abcParts?.trim()) {
    try {
      if (sameSongContent(content, abcToSongContent(toInlineAbc(input.abcParts)))) abcParts = input.abcParts;
    } catch {
      // Stale parts cannot override a valid object or inline source.
    }
  }
  try {
    abcParts ??= toSeparateAbc(abc);
  } catch {
    abcParts = "";
  }
  return { content, abc, abcParts };
}
