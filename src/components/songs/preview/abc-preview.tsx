"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import ABCJS from "abcjs";
import { LoaderCircle, Play, Square } from "lucide-react";
import { prepareAbcForDisplay } from "@/lib/abc-display";
import componentStyles from "./abc-preview.module.css";

type Synth = {
  init: (options: {
    visualObj: ABCJS.TuneObject;
    options?: {
      chordsOff?: boolean;
      midiTranspose?: number;
      onEnded?: () => void;
      soundFontUrl?: string;
      voicesOff?: boolean;
    };
  }) => Promise<unknown>;
  prime: () => Promise<unknown>;
  seek: (position: number, units?: "seconds" | "beats" | "percent") => void;
  start: () => void;
  pause: () => number;
  resume: () => void;
  stop: () => number;
  getIsRunning: () => boolean;
};

type SelectedChordVariant = {
  id: string;
  startMeasure: number;
  endMeasure: number;
  chords: readonly string[];
};

type PlaybackPart = "melody" | "chords" | "both";

const BRAVURA_BASELINE_SHIFT = "35%";
const BRAVURA_BOUNDARY_SPACING = ".25%";
const CHORD_LABEL_Y_OFFSET = 10; // SVG user units; positive values move chord labels down.

function isBravuraSymbol(codePoint: number) {
  return (
    (codePoint >= 0x2669 && codePoint <= 0x266f) ||
    (codePoint >= 0xe000 && codePoint <= 0xf5fa) ||
    (codePoint >= 0x1d100 && codePoint <= 0x1d1e8)
  );
}

function raiseBravuraChordGlyphs(container: HTMLElement) {
  const chordLabels = container.querySelectorAll<SVGTextElement>(".abcjs-chord");

  for (const chordLabel of chordLabels) {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(chordLabel, NodeFilter.SHOW_TEXT);
    let currentNode = walker.nextNode();

    while (currentNode) {
      if (currentNode.nodeValue) textNodes.push(currentNode as Text);
      currentNode = walker.nextNode();
    }

    const hasBravuraSymbol = textNodes.some((textNode) =>
      Array.from(textNode.data).some((character) => isBravuraSymbol(character.codePointAt(0) ?? 0)),
    );
    if (!hasBravuraSymbol) continue;

    let previousWasBravura: boolean | null = null;
    for (const textNode of textNodes) {
      const characters = Array.from(textNode.data);
      const replacement = document.createDocumentFragment();
      for (const character of characters) {
        const isBravura = isBravuraSymbol(character.codePointAt(0) ?? 0);
        const glyph = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
        if (isBravura) glyph.setAttribute("baseline-shift", BRAVURA_BASELINE_SHIFT);
        if (previousWasBravura !== null && previousWasBravura !== isBravura) {
          glyph.setAttribute("dx", BRAVURA_BOUNDARY_SPACING);
        }
        glyph.textContent = character;
        replacement.appendChild(glyph);
        previousWasBravura = isBravura;
      }
      textNode.replaceWith(replacement);
    }
  }
}

function offsetChordLabels(container: HTMLElement, offset: number) {
  const chordLabels = container.querySelectorAll<SVGTextElement>(".abcjs-chord");

  for (const chordLabel of chordLabels) {
    const y = chordLabel.getAttribute("y");
    if (y === null) continue;

    const currentY = Number(y);
    if (Number.isFinite(currentY)) {
      chordLabel.setAttribute("y", String(currentY + offset));
    }
  }
}

function centerLyricsUnderNoteheads(container: HTMLElement) {
  const lyricLabels = container.querySelectorAll<SVGTextElement>(".abcjs-lyric");

  for (const lyricLabel of lyricLabels) {
    const note = lyricLabel.closest<SVGGElement>("g.abcjs-note");
    if (!note) continue;

    const noteheads = note.querySelectorAll<SVGGraphicsElement>(".abcjs-notehead");
    let left = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;

    for (const notehead of noteheads) {
      try {
        const bounds = notehead.getBBox();
        if (bounds.width <= 0) continue;
        left = Math.min(left, bounds.x);
        right = Math.max(right, bounds.x + bounds.width);
      } catch {
        // Keep abcjs's original lyric anchor if the browser can't measure the SVG head.
      }
    }

    if (!Number.isFinite(left) || !Number.isFinite(right)) continue;

    const noteheadCenter = (left + right) / 2;
    lyricLabel.setAttribute("x", String(noteheadCenter));
    lyricLabel.querySelectorAll<SVGTSpanElement>("tspan").forEach((line) => {
      line.setAttribute("x", String(noteheadCenter));
    });
  }
}

function countMeasures(abc: string) {
  try {
    return Math.max(1, ABCJS.extractMeasures(abc)[0]?.measures.length ?? 1);
  } catch {
    return 1;
  }
}

function applyChordVariant(abc: string, variant: SelectedChordVariant | null | undefined) {
  if (!variant) return abc;

  let measure = 1;
  const replacedMeasures = new Set<number>();
  let musicStarted = false;

  return abc
    .split("\n")
    .map((line) => {
      if (!musicStarted) {
        if (/^K\s*:/i.test(line)) musicStarted = true;
        return line;
      }

      let result = "";
      let index = 0;
      while (index < line.length) {
        if (line[index] === '"') {
          const closingQuote = line.indexOf('"', index + 1);
          if (closingQuote < 0) {
            result += line.slice(index);
            break;
          }

          const variantIndex = measure - variant.startMeasure;
          const replacement =
            measure >= variant.startMeasure &&
            measure <= variant.endMeasure &&
            !replacedMeasures.has(measure) &&
            variantIndex >= 0 &&
            variantIndex < variant.chords.length
              ? variant.chords[variantIndex]
              : undefined;
          result += replacement ? `"${replacement}"` : line.slice(index, closingQuote + 1);
          if (replacement) replacedMeasures.add(measure);
          index = closingQuote + 1;
          continue;
        }

        const character = line[index];
        result += character;
        if (character === "|") measure += 1;
        index += 1;
      }
      return result;
    })
    .join("\n");
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLAnchorElement ||
    target instanceof HTMLButtonElement ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  );
}

export function AbcPreview({
  abc,
  showChords = true,
  showLyrics = true,
  transposition = 0,
  selectedChordVariant = null,
  saveAction,
  publishAction,
  onRenderedSvg,
}: {
  abc: string;
  showChords?: boolean;
  showLyrics?: boolean;
  transposition?: number;
  selectedChordVariant?: SelectedChordVariant | null;
  saveAction?: ReactNode;
  publishAction?: ReactNode;
  onRenderedSvg?: (svg: SVGSVGElement | null) => void;
}) {
  const targetRef = useRef<HTMLDivElement>(null);
  const tuneRef = useRef<ABCJS.TuneObject | null>(null);
  const synthRef = useRef<Synth | null>(null);
  const timingRef = useRef<ABCJS.TimingCallbacks | null>(null);
  const selectedNoteRef = useRef<{ seconds: number; measure: number } | null>(null);
  const selectedNoteElementRef = useRef<Element | null>(null);
  const highlightedElementsRef = useRef<Element[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackPart, setPlaybackPart] = useState<PlaybackPart>("both");
  const [startMeasure, setStartMeasure] = useState(1);
  const renderedAbc = prepareAbcForDisplay(applyChordVariant(abc, selectedChordVariant), {
    showChords,
    showLyrics,
    transposition: 0,
  });
  const measureCount = countMeasures(renderedAbc);
  const selectedVariantKey = selectedChordVariant
    ? `${selectedChordVariant.id}:${selectedChordVariant.startMeasure}:${selectedChordVariant.endMeasure}:${selectedChordVariant.chords.join("|")}`
    : "";

  const clearSelectedNote = useCallback(() => {
    selectedNoteElementRef.current?.classList.remove("abcjs-note-start-selected");
    selectedNoteElementRef.current = null;
    selectedNoteRef.current = null;
  }, []);

  const clearPlaybackHighlight = useCallback(() => {
    for (const element of highlightedElementsRef.current) {
      element.classList.remove("abcjs-note-playing");
    }
    highlightedElementsRef.current = [];
  }, []);

  const handleTimingEvent = useCallback((event: ABCJS.NoteTimingEvent | null): undefined => {
    clearPlaybackHighlight();
    if (!event?.elements) return undefined;

    highlightedElementsRef.current = event.elements.flat().filter(Boolean);
    for (const element of highlightedElementsRef.current) {
      element.classList.add("abcjs-note-playing");
    }
    return undefined;
  }, [clearPlaybackHighlight]);

  useEffect(() => {
    clearSelectedNote();
    clearPlaybackHighlight();
    queueMicrotask(() => {
      setError(null);
      setIsPlaying(false);
      setIsPaused(false);
      setIsLoading(false);
      setPlaybackPart("both");
      setStartMeasure(1);
    });
    let errorTimeout: number | undefined;
    const scheduleError = (message: string) => {
      errorTimeout = window.setTimeout(() => setError(message), 0);
    };

    if (!targetRef.current || !renderedAbc.trim()) {
      onRenderedSvg?.(null);
      scheduleError("Add ABC notation to see the staff preview.");
      return () => {
        if (errorTimeout) window.clearTimeout(errorTimeout);
      };
    }

    targetRef.current.innerHTML = "";
    try {
      const rendered = ABCJS.renderAbc(targetRef.current, renderedAbc, {
        add_classes: true,
        foregroundColor: "#252631",
        paddingbottom: 4,
        paddingleft: 2,
        paddingright: 2,
        paddingtop: 5,
        responsive: "resize",
        scale: 1.06,
        selectTypes: ["note"],
        staffwidth: 720,
        visualTranspose: transposition,
        clickListener: (abcElement, _tuneNumber, _classes, analysis) => {
          if (abcElement.el_type !== "note") return;

          const measure = Math.max(1, analysis.measure + 1);
          const startChar = abcElement.startChar;
          const noteTiming =
            typeof startChar === "number"
              ? timingRef.current?.noteTimings.find(
                  (timing) =>
                    timing.type === "event" &&
                    (timing.startChar === startChar || timing.startCharArray?.includes(startChar)),
                )
              : undefined;

          selectedNoteRef.current = noteTiming ? { measure, seconds: noteTiming.milliseconds / 1000 } : null;
          selectedNoteElementRef.current?.classList.remove("abcjs-note-start-selected");
          selectedNoteElementRef.current = analysis.selectableElement ?? null;
          selectedNoteElementRef.current?.classList.add("abcjs-note-start-selected");
          setStartMeasure(measure);
        },
      });
      centerLyricsUnderNoteheads(targetRef.current);
      offsetChordLabels(targetRef.current, CHORD_LABEL_Y_OFFSET);
      raiseBravuraChordGlyphs(targetRef.current);
      onRenderedSvg?.(targetRef.current.querySelector("svg"));
      tuneRef.current = rendered[0];
      timingRef.current = new ABCJS.TimingCallbacks(tuneRef.current, {
        eventCallback: handleTimingEvent,
      });
    } catch (renderError) {
      tuneRef.current = null;
      onRenderedSvg?.(null);
      scheduleError(renderError instanceof Error ? renderError.message : "ABC could not be rendered.");
    }

    return () => {
      if (errorTimeout) window.clearTimeout(errorTimeout);
      if (synthRef.current) synthRef.current.stop();
      timingRef.current?.stop();
      synthRef.current = null;
      timingRef.current = null;
      tuneRef.current = null;
      onRenderedSvg?.(null);
      clearSelectedNote();
      clearPlaybackHighlight();
    };
  }, [
    clearPlaybackHighlight,
    clearSelectedNote,
    handleTimingEvent,
    onRenderedSvg,
    renderedAbc,
    selectedVariantKey,
    showChords,
    showLyrics,
    transposition,
  ]);

  const startPlayback = useCallback(async () => {
    if (!tuneRef.current || isLoading) return;

    setIsLoading(true);
    try {
      const synth = new ABCJS.synth.CreateSynth() as Synth;
      const partOptions =
        {
          ...(playbackPart === "melody" || !showChords ? { chordsOff: true } : {}),
          ...(playbackPart === "chords" ? { voicesOff: true } : {}),
        };
      await synth.init({
        visualObj: tuneRef.current,
        options: {
          ...partOptions,
          midiTranspose: transposition,
          onEnded: () => {
            timingRef.current?.stop();
            clearPlaybackHighlight();
            setIsPlaying(false);
            setIsPaused(false);
          },
          soundFontUrl: "https://paulrosen.github.io/midi-js-soundfonts/FluidR3_GM/",
        },
      });
      await synth.prime();
      const selectedNote = selectedNoteRef.current;
      if (selectedNote) {
        synth.seek(selectedNote.seconds, "seconds");
      } else if (startMeasure > 1) {
        synth.seek((startMeasure - 1) / measureCount, "percent");
      }
      synthRef.current = synth;
      synth.start();
      if (selectedNote) {
        timingRef.current?.start(selectedNote.seconds, "seconds");
      } else if (startMeasure > 1) {
        timingRef.current?.start((startMeasure - 1) / measureCount, "percent");
      } else {
        timingRef.current?.start();
      }
      setIsPlaying(true);
      setIsPaused(false);
    } catch (playbackError) {
      timingRef.current?.stop();
      clearPlaybackHighlight();
      setError(playbackError instanceof Error ? playbackError.message : "Audio preview is unavailable.");
    } finally {
      setIsLoading(false);
    }
  }, [clearPlaybackHighlight, isLoading, measureCount, playbackPart, showChords, startMeasure, transposition]);

  const stopPlayback = useCallback(() => {
    synthRef.current?.stop();
    timingRef.current?.stop();
    clearPlaybackHighlight();
    setIsPlaying(false);
    setIsPaused(false);
  }, [clearPlaybackHighlight]);

  const pausePlayback = useCallback(() => {
    if (!synthRef.current?.getIsRunning()) return;
    timingRef.current?.pause();
    synthRef.current.pause();
    setIsPlaying(false);
    setIsPaused(true);
  }, []);

  const resumePlayback = useCallback(() => {
    if (!synthRef.current || !isPaused) return;
    synthRef.current.resume();
    timingRef.current?.start();
    setIsPlaying(true);
    setIsPaused(false);
  }, [isPaused]);

  const togglePlayback = useCallback(() => {
    if (synthRef.current?.getIsRunning()) {
      stopPlayback();
      return;
    }
    if (isPaused) {
      resumePlayback();
      return;
    }
    void startPlayback();
  }, [isPaused, resumePlayback, startPlayback, stopPlayback]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || isInteractiveTarget(event.target)) return;
      event.preventDefault();
      if (synthRef.current?.getIsRunning()) {
        pausePlayback();
      } else if (isPaused) {
        resumePlayback();
      } else {
        void startPlayback();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPaused, pausePlayback, resumePlayback, startPlayback]);

  return (
    <>
      <div
        className={componentStyles.leadSheetPreview}
        aria-label="Rendered lead sheet"
      >
        <div>
          <div
            ref={targetRef}
            className={`${componentStyles.notationCanvas} abcjs-preview ${
              [
                !showChords && "abc-preview-hide-chords",
                !showLyrics && "abc-preview-hide-lyrics",
              ]
                .filter(Boolean)
                .join(" ")
            } ${error ? componentStyles.notationErrorState : ""}`}
          />
        </div>
        {error && (
          <div className={componentStyles.playbackErrorPanel}>
            <div>
              {error}
              <code className={componentStyles.syntaxHelpExample}>
                Check the ABC header and note syntax.
              </code>
            </div>
          </div>
        )}
      </div>
      <div className={componentStyles.playbackControls}>
        <div className={componentStyles.playbackFieldGroup}>
          <label className={componentStyles.playbackFieldLabel}>
            Parts
            <select
              aria-label="Playback parts"
              className={componentStyles.playbackSelect}
              value={playbackPart}
              onChange={(event) => setPlaybackPart(event.target.value as PlaybackPart)}
            >
              <option value="melody">Melody</option>
              <option value="chords">Chords</option>
              <option value="both">Melody + chords</option>
            </select>
          </label>
          <label className={componentStyles.playbackFieldLabel}>
            Start measure
            <select
              aria-label="Playback start measure"
              className={componentStyles.playbackSelect}
              value={startMeasure}
              onChange={(event) => {
                clearSelectedNote();
                setStartMeasure(Number(event.target.value));
              }}
            >
              {Array.from({ length: measureCount }, (_, index) => {
                const measure = index + 1;
                return (
                  <option key={measure} value={measure}>
                    {measure}
                  </option>
                );
              })}
            </select>
          </label>
          <button
            aria-label={isPlaying ? "Stop playback" : isPaused ? "Resume playback" : "Play lead sheet"}
            className={componentStyles.playbackButton}
            disabled={Boolean(error) || isLoading}
            type="button"
            onClick={togglePlayback}
          >
            {isLoading ? (
              <LoaderCircle className={componentStyles.loadingSpinner} size={14} strokeWidth={2} />
            ) : isPlaying ? (
              <Square size={12} fill="currentColor" strokeWidth={1.8} />
            ) : (
              <Play size={13} fill="currentColor" strokeWidth={1.8} />
            )}
          </button>
          <span className={componentStyles.playbackStatus}>
            {isPlaying ? "Playing" : isPaused ? "Paused" : "Play preview"}
          </span>
        </div>
      </div>
      {(saveAction || publishAction) && (
        <div className={componentStyles.songActions}>
          {saveAction}
          {publishAction}
        </div>
      )}
    </>
  );
}
