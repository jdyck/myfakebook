"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import ABCJS from "abcjs";
import { LoaderCircle, Play, Square } from "lucide-react";
import { prepareAbcForDisplay } from "@/lib/abc-display";

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
}: {
  abc: string;
  showChords?: boolean;
  showLyrics?: boolean;
  transposition?: number;
  selectedChordVariant?: SelectedChordVariant | null;
  saveAction?: ReactNode;
  publishAction?: ReactNode;
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
      tuneRef.current = rendered[0];
      timingRef.current = new ABCJS.TimingCallbacks(tuneRef.current, {
        eventCallback: handleTimingEvent,
      });
    } catch (renderError) {
      tuneRef.current = null;
      scheduleError(renderError instanceof Error ? renderError.message : "ABC could not be rendered.");
    }

    return () => {
      if (errorTimeout) window.clearTimeout(errorTimeout);
      if (synthRef.current) synthRef.current.stop();
      timingRef.current?.stop();
      synthRef.current = null;
      timingRef.current = null;
      tuneRef.current = null;
      clearSelectedNote();
      clearPlaybackHighlight();
    };
  }, [
    clearPlaybackHighlight,
    clearSelectedNote,
    handleTimingEvent,
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
        className="relative min-h-[480px] flex-1 overflow-auto rounded-[8px] border border-[var(--line)] bg-[#fffefb] px-3.5 py-[18px] [scrollbar-color:#d1d1cb_transparent] dark:bg-[#f7f4e9] max-[720px]:min-h-[390px]"
        aria-label="Rendered lead sheet"
      >
        <div>
          <div
            ref={targetRef}
            className={`min-w-125 px-2 pb-3.5 pt-2.5 [&_svg]:overflow-visible [&_svg]:text-[#252631] ${
              [
                !showChords && "abc-preview-hide-chords",
                !showLyrics && "abc-preview-hide-lyrics",
              ]
                .filter(Boolean)
                .join(" ")
            } ${error ? "hidden" : ""}`}
          />
        </div>
        {error && (
          <div className="grid min-h-[320px] place-items-center p-[30px] text-center text-[11px] leading-[1.6] text-[var(--amber)]">
            <div>
              {error}
              <code className="mt-[7px] block font-mono text-[10px] text-[var(--muted-soft)]">
                Check the ABC header and note syntax.
              </code>
            </div>
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center border-t border-[var(--line)] pt-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-[10px] font-[650] text-[var(--muted)]">
            Parts
            <select
              aria-label="Playback parts"
              className="rounded-[6px] border border-[var(--line-strong)] bg-[var(--paper)] px-1.5 py-1 text-[10px] text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              value={playbackPart}
              onChange={(event) => setPlaybackPart(event.target.value as PlaybackPart)}
            >
              <option value="melody">Melody</option>
              <option value="chords">Chords</option>
              <option value="both">Melody + chords</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-[10px] font-[650] text-[var(--muted)]">
            Start measure
            <select
              aria-label="Playback start measure"
              className="rounded-[6px] border border-[var(--line-strong)] bg-[var(--paper)] px-1.5 py-1 text-[10px] text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
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
            className="grid size-[31px] cursor-pointer place-items-center rounded-[7px] border border-[var(--line-strong)] bg-[var(--paper)] text-[var(--accent)] transition-[border-color,background-color] duration-[160ms] ease-in-out hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed"
            disabled={Boolean(error) || isLoading}
            type="button"
            onClick={togglePlayback}
          >
            {isLoading ? (
              <LoaderCircle className="animate-spin" size={14} strokeWidth={2} />
            ) : isPlaying ? (
              <Square size={12} fill="currentColor" strokeWidth={1.8} />
            ) : (
              <Play size={13} fill="currentColor" strokeWidth={1.8} />
            )}
          </button>
          <span className="text-[10px] font-[650] text-[var(--muted)]">
            {isPlaying ? "Playing" : isPaused ? "Paused" : "Play preview"}
          </span>
        </div>
      </div>
      {(saveAction || publishAction) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {saveAction}
          {publishAction}
        </div>
      )}
    </>
  );
}
