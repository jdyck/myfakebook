"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import {
  formatAbcRows,
  parseAbcRowText,
  parseAbcRows,
  serializeAbcRows,
  splitLyricSyllables,
  type AbcRowLyricsPart,
  type AbcRowMusicPart,
} from "@/lib/abc-rows";
import componentStyles from "./abc-row-editor.module.css";

type AbcRowEditorProps = {
  abc: string;
  onChange: (value: string) => void;
};

type CaretAnchor = {
  lineIndex: number;
  tokenIndex: number | null;
  tokenOffset: number;
  column: number;
  tokenText: string | null;
};

type PendingSelection = {
  start: CaretAnchor;
  end: CaretAnchor;
  direction: HTMLTextAreaElement["selectionDirection"];
};

function captureCaretAnchor(value: string, position: number): CaretAnchor {
  const lineStart = position === 0 ? 0 : value.lastIndexOf("\n", position - 1) + 1;
  const lineEnd = value.indexOf("\n", position);
  const line = value.slice(lineStart, lineEnd === -1 ? value.length : lineEnd);
  const column = position - lineStart;
  const tokens = Array.from(line.matchAll(/\S+/g));
  const lineIndex = value.slice(0, lineStart).split("\n").length - 1;

  for (const [tokenIndex, match] of tokens.entries()) {
    const tokenStart = match.index ?? 0;
    const tokenEnd = tokenStart + match[0].length;
    if (column >= tokenStart && column <= tokenEnd) {
      return { lineIndex, tokenIndex, tokenOffset: column - tokenStart, column, tokenText: match[0] };
    }
  }

  const nextTokenIndex = tokens.findIndex((match) => (match.index ?? 0) > column);
  if (nextTokenIndex !== -1) {
    return { lineIndex, tokenIndex: nextTokenIndex, tokenOffset: 0, column, tokenText: tokens[nextTokenIndex][0] };
  }

  if (tokens.length) {
    const lastToken = tokens.at(-1)!;
    return {
      lineIndex,
      tokenIndex: tokens.length - 1,
      tokenOffset: lastToken[0].length + 1,
      column,
      tokenText: lastToken[0],
    };
  }

  return { lineIndex, tokenIndex: null, tokenOffset: 0, column, tokenText: null };
}

function resolveCaretAnchor(value: string, anchor: CaretAnchor) {
  const lines = value.split("\n");
  const lineIndex = Math.min(anchor.lineIndex, lines.length - 1);
  const line = lines[lineIndex] ?? "";
  let lineStart = 0;
  for (let index = 0; index < lineIndex; index += 1) {
    lineStart += (lines[index]?.length ?? 0) + 1;
  }

  if (anchor.tokenIndex !== null) {
    let tokenIndex = anchor.tokenIndex;
    let tokenOffset = anchor.tokenOffset;
    if (anchor.tokenText) {
      const syllables = splitLyricSyllables(anchor.tokenText);
      if (syllables.length > 1) {
        if (anchor.tokenOffset > anchor.tokenText.length) {
          tokenIndex += syllables.length - 1;
          tokenOffset = syllables.at(-1)!.length + 1;
        } else {
          let remaining = anchor.tokenOffset;
          for (const [syllableIndex, syllable] of syllables.entries()) {
            if (remaining <= syllable.length || syllableIndex === syllables.length - 1) {
              tokenIndex += syllableIndex;
              tokenOffset = Math.min(remaining, syllable.length);
              break;
            }
            remaining -= syllable.length;
          }
        }
      }
    }

    const tokens = Array.from(line.matchAll(/\S+/g));
    const token = tokens[tokenIndex] ?? tokens.at(-1);
    if (token) {
      const offset = Math.min(tokenOffset, token[0].length);
      const separator = tokenOffset > token[0].length ? 1 : 0;
      return lineStart + (token.index ?? 0) + offset + separator;
    }
  }

  return lineStart + Math.min(anchor.column, line.length);
}

function isLyricsRow(document: ReturnType<typeof parseAbcRows>, lineIndex: number) {
  const musicParts = document.parts.filter((part): part is AbcRowMusicPart => part.kind === "music");
  let firstLine = 0;

  for (const [partIndex, music] of musicParts.entries()) {
    const lyricCount = document.parts.filter((part) => part.kind === "lyrics" && part.targetId === music.id).length;
    const firstLyricsLine = firstLine + 2;
    if (lineIndex >= firstLyricsLine && lineIndex < firstLyricsLine + lyricCount) return true;
    firstLine += 2 + lyricCount + (partIndex < musicParts.length - 1 ? 1 : 0);
  }

  return false;
}

function emptyLyricsPartAtLine(document: ReturnType<typeof parseAbcRows>, lineIndex: number) {
  const musicParts = document.parts.filter((part): part is AbcRowMusicPart => part.kind === "music");
  let firstLine = 0;

  for (const [partIndex, music] of musicParts.entries()) {
    const lyricsParts = document.parts.filter(
      (part): part is AbcRowLyricsPart => part.kind === "lyrics" && part.targetId === music.id,
    );
    const lyricIndex = lineIndex - firstLine - 2;
    const lyrics = lyricsParts[lyricIndex];
    if (lyrics && lyrics.tokens.every((token) => !token.trim())) return lyrics;
    firstLine += 2 + lyricsParts.length + (partIndex < musicParts.length - 1 ? 1 : 0);
  }

  return null;
}

function musicAtMelodyLine(document: ReturnType<typeof parseAbcRows>, lineIndex: number) {
  const musicParts = document.parts.filter((part): part is AbcRowMusicPart => part.kind === "music");
  let firstLine = 0;

  for (const [partIndex, music] of musicParts.entries()) {
    const lyricCount = document.parts.filter((part) => part.kind === "lyrics" && part.targetId === music.id).length;
    if (lineIndex === firstLine + 1) return music;
    firstLine += 2 + lyricCount + (partIndex < musicParts.length - 1 ? 1 : 0);
  }

  return null;
}

function addBlankLyricsPart(document: ReturnType<typeof parseAbcRows>, musicId: string) {
  const musicIndex = document.parts.findIndex((part) => part.kind === "music" && part.id === musicId);
  if (musicIndex === -1) return document;

  const existingIds = new Set(document.parts.flatMap((part) => part.kind === "lyrics" ? [part.id] : []));
  let lyricNumber = 0;
  while (existingIds.has(`lyrics-${lyricNumber}`)) lyricNumber += 1;

  const nextMusicIndex = document.parts.findIndex((part, index) => index > musicIndex && part.kind === "music");
  const insertAt = nextMusicIndex === -1 ? document.parts.length : nextMusicIndex;
  return {
    ...document,
    parts: [
      ...document.parts.slice(0, insertAt),
      { kind: "lyrics" as const, id: `lyrics-${lyricNumber}`, targetId: musicId, prefix: "w:", tokens: [] },
      ...document.parts.slice(insertAt),
    ],
  };
}

export function AbcRowEditor({ abc, onChange }: AbcRowEditorProps) {
  const [document, setDocument] = useState(() => parseAbcRows(abc));
  const [rowText, setRowText] = useState(() => formatAbcRows(parseAbcRows(abc)));
  const [rowsAreValid, setRowsAreValid] = useState(true);
  const documentRef = useRef(document);
  const lastStructuredValueRef = useRef<string | null>(null);
  const lastObservedValueRef = useRef(abc);
  const gutterRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingSelectionRef = useRef<PendingSelection | null>(null);

  useEffect(() => {
    if (lastStructuredValueRef.current === abc) {
      lastStructuredValueRef.current = null;
      lastObservedValueRef.current = abc;
      return;
    }
    if (lastObservedValueRef.current === abc) return;

    lastStructuredValueRef.current = null;
    lastObservedValueRef.current = abc;
    const nextDocument = parseAbcRows(abc);
    documentRef.current = nextDocument;
    setDocument(nextDocument);
    setRowText(formatAbcRows(nextDocument));
    setRowsAreValid(true);
  }, [abc]);

  useLayoutEffect(() => {
    const selection = pendingSelectionRef.current;
    pendingSelectionRef.current = null;
    const textarea = textareaRef.current;
    if (!selection || !textarea || textarea !== textarea.ownerDocument.activeElement) return;

    const start = resolveCaretAnchor(rowText, selection.start);
    const end = resolveCaretAnchor(rowText, selection.end);
    textarea.setSelectionRange(start, end, selection.direction);
  }, [rowText]);

  function handleRowTextChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const { currentTarget: textarea } = event;
    const value = textarea.value;
    const nextDocument = parseAbcRowText(value, documentRef.current);
    if (!nextDocument) {
      pendingSelectionRef.current = null;
      setRowText(value);
      setRowsAreValid(false);
      return;
    }

    const selection: PendingSelection = {
      start: captureCaretAnchor(value, textarea.selectionStart),
      end: captureCaretAnchor(value, textarea.selectionEnd),
      direction: textarea.selectionDirection,
    };
    documentRef.current = nextDocument;
    setDocument(nextDocument);
    setRowsAreValid(true);

    const line = value.split("\n")[selection.start.lineIndex] ?? "";
    const caretFollowsWhitespace = selection.start.column > 0 && /\s/.test(line[selection.start.column - 1] ?? "");
    const nextRowText = isLyricsRow(nextDocument, selection.start.lineIndex) && !caretFollowsWhitespace
      ? formatAbcRows(nextDocument)
      : value;
    pendingSelectionRef.current = nextRowText === value ? null : selection;
    setRowText(nextRowText);

    const nextAbc = serializeAbcRows(nextDocument);
    lastStructuredValueRef.current = nextAbc;
    onChange(nextAbc);
  }

  function applyStructuredUpdate(
    nextDocument: ReturnType<typeof parseAbcRows>,
    nextRowText: string,
    selection: PendingSelection | null,
  ) {
    pendingSelectionRef.current = selection;
    documentRef.current = nextDocument;
    setDocument(nextDocument);
    setRowsAreValid(true);
    setRowText(nextRowText);

    const nextAbc = serializeAbcRows(nextDocument);
    lastStructuredValueRef.current = nextAbc;
    onChange(nextAbc);
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const textarea = event.currentTarget;
    if (event.altKey || event.ctrlKey || event.metaKey || !rowsAreValid || textarea.selectionStart !== textarea.selectionEnd) return;

    const caret = textarea.selectionStart;
    const lineStart = caret === 0 ? 0 : rowText.lastIndexOf("\n", caret - 1) + 1;
    const nextLineBreak = rowText.indexOf("\n", caret);
    const lineEnd = nextLineBreak === -1 ? rowText.length : nextLineBreak;
    const lineIndex = rowText.slice(0, lineStart).split("\n").length - 1;

    let lyricLineIndex: number | null = null;
    let caretLineIndex = lineIndex;
    if (event.key === "Backspace" && caret === lineStart) {
      lyricLineIndex = lineIndex;
      caretLineIndex = lineIndex - 1;
    } else if (event.key === "Delete" && caret === lineEnd) {
      lyricLineIndex = lineIndex + 1;
    }

    if (lyricLineIndex !== null) {
      const lyricPart = emptyLyricsPartAtLine(documentRef.current, lyricLineIndex);
      if (lyricPart) {
        event.preventDefault();
        const nextDocument = {
          ...documentRef.current,
          parts: documentRef.current.parts.filter((part) => part.kind !== "lyrics" || part.id !== lyricPart.id),
        };
        const nextRowText = formatAbcRows(nextDocument);
        const anchor: CaretAnchor = {
          lineIndex: Math.max(0, caretLineIndex),
          tokenIndex: null,
          tokenOffset: 0,
          column: nextRowText.split("\n")[Math.max(0, caretLineIndex)]?.length ?? 0,
          tokenText: null,
        };
        applyStructuredUpdate(nextDocument, nextRowText, {
          start: anchor,
          end: anchor,
          direction: "none",
        });
        return;
      }
    }

    if (event.key !== "Enter" || caret !== lineEnd) return;
    const music = musicAtMelodyLine(documentRef.current, lineIndex);
    if (!music) return;

    event.preventDefault();
    const lyricParts = documentRef.current.parts.filter(
      (part): part is AbcRowLyricsPart => part.kind === "lyrics" && part.targetId === music.id,
    );
    const emptyLyricIndex = lyricParts.findIndex((lyrics) => lyrics.tokens.every((token) => !token.trim()));
    if (emptyLyricIndex !== -1) {
      const lyricLineIndex = lineIndex + 1 + emptyLyricIndex;
      const lyricLineStart = rowText
        .split("\n")
        .slice(0, lyricLineIndex)
        .reduce((offset, line) => offset + line.length + 1, 0);
      textarea.setSelectionRange(lyricLineStart, lyricLineStart);
      return;
    }

    const nextDocument = addBlankLyricsPart(documentRef.current, music.id);
    const nextRowText = formatAbcRows(nextDocument);
    const lyricRowAnchor: CaretAnchor = {
      lineIndex: lineIndex + lyricParts.length + 1,
      tokenIndex: null,
      tokenOffset: 0,
      column: 0,
      tokenText: null,
    };

    applyStructuredUpdate(nextDocument, nextRowText, {
      start: lyricRowAnchor,
      end: lyricRowAnchor,
      direction: "none",
    });
  }

  function normalizeRows() {
    if (rowsAreValid) setRowText(formatAbcRows(documentRef.current));
  }

  if (!document.supported) {
    return (
      <div className={componentStyles.unsupportedEditorPanel} role="tabpanel" id="abc-easy-panel" aria-labelledby="abc-easy-tab">
        <p className={componentStyles.unsupportedFormatMessage}>
          {document.reason} The source editor is still available in the Source tab.
        </p>
        <textarea
          aria-label="Easy ABC notation editor"
          className={componentStyles.unsupportedSourceTextarea}
          spellCheck={false}
          value={abc}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    );
  }

  const musicParts = document.parts.filter((part): part is AbcRowMusicPart => part.kind === "music");
  const gutterLabels = musicParts.flatMap((music, phraseIndex) => {
    const lyricCount = document.parts.filter((part) => part.kind === "lyrics" && part.targetId === music.id).length;
    return [
      ...(phraseIndex > 0 ? [""] : []),
      "C",
      "M",
      ...Array.from({ length: lyricCount }, (_, index) => index === 0 ? "L" : `L${index + 1}`),
    ];
  });

  return (
    <div className={componentStyles.easyEditorPanel} role="tabpanel" id="abc-easy-panel" aria-labelledby="abc-easy-tab">
      <div className={componentStyles.editorInstructionsRow}>
        <p className={componentStyles.editorInstructions}>
          Move through the rows with your arrow keys. Leave pickup chord cells blank; chords align to notes and lyrics align by syllable. Leave one blank line between phrases.
        </p>
        {!rowsAreValid && (
          <span className={componentStyles.rowValidationMessage} role="status">
            Keep the chord and melody rows on separate lines to sync changes.
          </span>
        )}
      </div>
      <div className={componentStyles.rowEditorGrid}>
        <div
          className={componentStyles.rowLabelGutter}
          ref={gutterRef}
          aria-hidden="true"
        >
          {gutterLabels.map((label, index) => (
            <span className={componentStyles.rowLabel} key={index}>
              {label}
            </span>
          ))}
        </div>
        <textarea
          aria-label="Easy chord, melody, and lyric editor"
          className={componentStyles.rowTextarea}
          ref={textareaRef}
          spellCheck={false}
          value={rowText}
          wrap="off"
          onBlur={normalizeRows}
          onChange={handleRowTextChange}
          onKeyDown={handleRowKeyDown}
          onScroll={(event) => {
            if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop;
          }}
        />
      </div>
    </div>
  );
}
