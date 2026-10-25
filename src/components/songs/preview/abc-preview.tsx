"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import ABCJS from "abcjs";
import { LoaderCircle, Play, Square } from "lucide-react";
import { prepareAbcForDisplay } from "@/lib/notation/abc-display";
import { Select } from "@/components/ui/select";
import componentStyles from "./abc-preview.module.css";

type Synth = {
  init: (options: {
    visualObj: ABCJS.TuneObject;
    millisecondsPerMeasure?: number;
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

type PlaybackPart = "melody" | "chords" | "both";

function addSystemStartBarlines(container: HTMLElement) {
  const wrappers = Array.from(container.querySelectorAll<SVGGElement>(".abcjs-staff-wrapper")).slice(1);

  for (const wrapper of wrappers) {
    const staffs = wrapper.querySelectorAll<SVGGElement>(".abcjs-staff");

    for (const staff of staffs) {
      let bounds: DOMRect | SVGRect;
      try {
        bounds = staff.getBBox();
      } catch {
        continue;
      }
      if (bounds.width <= 0 || bounds.height <= 0) continue;

      const barline = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const x = bounds.x;
      barline.setAttribute("class", "abcjs-system-start-barline");
      barline.setAttribute("d", `M ${x} ${bounds.y} L ${x} ${bounds.y + bounds.height}`);
      barline.setAttribute("fill", "none");
      barline.setAttribute("stroke", "#252631");
      barline.setAttribute("stroke-width", "1.2");
      staff.appendChild(barline);
    }
  }
}

function countMeasures(abc: string) {
  try {
    return Math.max(1, ABCJS.extractMeasures(abc)[0]?.measures.length ?? 1);
  } catch {
    return 1;
  }
}

function removeRepeatedPreviewMetadata(abc: string) {
  let inHeader = true;
  const output: string[] = [];
  const lines = abc.replaceAll("\r", "").split("\n");

  for (const line of lines) {
    if (inHeader && /^K\s*:/i.test(line)) {
      inHeader = false;
      output.push(line);
      continue;
    }

    if (inHeader && /^[QO]\s*:/i.test(line)) {
      const colon = line.indexOf(":");
      const blankedLine = `${line.slice(0, colon + 1)}${" ".repeat(line.length - colon - 1)}`;
      output.push(blankedLine);
      continue;
    }

    output.push(line);
  }

  return { abc: output.join("\n") };
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
  isZoomed = false,
  abc,
  showChords = true,
  showLyrics = true,
  showParts = true,
  showFirstLineClefOnly = true,
  transposition = 0,
  workspaceToolbar,
  displayControls,
  saveAction,
  publishAction,
  onRenderedSvg,
}: {
  isZoomed?: boolean;
  abc: string;
  showChords?: boolean;
  showLyrics?: boolean;
  showParts?: boolean;
  showFirstLineClefOnly?: boolean;
  transposition?: number;
  workspaceToolbar?: ReactNode;
  displayControls?: ReactNode;
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
  const [tempoInput, setTempoInput] = useState(() => {
    try { return String(Math.round(ABCJS.parseOnly(abc)[0]?.getBpm() ?? 120)); } catch { return "120"; }
  });
  const tempo = Math.min(240, Math.max(40, Number(tempoInput) || 120));
  const renderedAbc = prepareAbcForDisplay(abc, {
    showChords,
    showLyrics,
    showParts,
    showFirstLineClefOnly,
    transposition: 0,
  });
  const previewSource = useMemo(() => removeRepeatedPreviewMetadata(renderedAbc), [renderedAbc]);
  const measureCount = countMeasures(renderedAbc);
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
      const previewTitle = renderedAbc.match(/^T:\s*(.+)$/m)?.[1]?.trim();
      const rendered = ABCJS.renderAbc(targetRef.current, previewSource.abc, {
        add_classes: true,
        ariaLabel: previewTitle ? `Sheet music for ${previewTitle}` : "Lead sheet preview",
        foregroundColor: "#0b0b0b",
        format: { partsbox: true, titlefont: "Times New Roman 22", composerfont: "Times New Roman Italic 12", gchordfont: "Arial 12", vocalfont: "Times New Roman 12" },
        paddingtop: 8,
        paddingbottom: 14,
        paddingleft: 5,
        paddingright: 5,
        responsive: "resize",
        scale: 1,
        // ABCJS counts text/subtitle lines too, so its initialClef option can
        // suppress the first musical staff's clef. Filter musical systems below.
        initialClef: false,
        selectTypes: ["note"],
        staffwidth: 800,
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
      if (showFirstLineClefOnly) {
        Array.from(targetRef.current.querySelectorAll<SVGGElement>(".abcjs-staff-wrapper"))
          .slice(1)
          .forEach((staff) => {
            staff.querySelectorAll(".abcjs-clef, .abcjs-key-signature").forEach((element) => element.remove());
          });
        addSystemStartBarlines(targetRef.current);
      }
      onRenderedSvg?.(targetRef.current.querySelector("svg"));
      const playbackTune = ABCJS.parseOnly(renderedAbc)[0] ?? rendered[0];
      tuneRef.current = playbackTune;
      timingRef.current = new ABCJS.TimingCallbacks(playbackTune, {
        qpm: tempo,
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
    previewSource,
    renderedAbc,
    showFirstLineClefOnly,
    showChords,
    showLyrics,
    transposition,
    tempo,
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
        millisecondsPerMeasure: tuneRef.current.millisecondsPerMeasure(tempo),
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
  }, [clearPlaybackHighlight, isLoading, measureCount, playbackPart, showChords, startMeasure, transposition, tempo]);

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
    <div className={componentStyles.previewLayout}>
      <div className={componentStyles.scoreToolbar}>
        {workspaceToolbar}
      </div>
      <div
        className={componentStyles.leadSheetPreview}
        aria-label="Rendered lead sheet"
        tabIndex={0}
      >
        <div className={`${componentStyles.previewPage} ${isZoomed ? componentStyles.zoomedPage : ""}`}>
          <div
            ref={targetRef}
            id="song-score"
            tabIndex={-1}
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
      <aside aria-label="Preview controls" className={componentStyles.previewControls}>
        {displayControls}
        <div className={componentStyles.playbackControls}>
          <p className={componentStyles.sectionLabel}>PLAY PREVIEW</p>
          <div className={componentStyles.playbackFieldGroup}>
            <label className={componentStyles.playbackFieldLabel}>
              Parts
              <Select
                ariaLabel="Playback parts"
                variant="field"
                className={componentStyles.playbackSelect}
                value={playbackPart}
                onValueChange={(value) => setPlaybackPart(value as PlaybackPart)}
                options={[
                  { value: "melody", label: "Melody" },
                  { value: "chords", label: "Chords" },
                  { value: "both", label: "Melody + chords" },
                ]}
              />
            </label>
            <label className={componentStyles.tempoField}>
              Tempo <span>BPM</span>
              <input aria-label="Playback tempo" type="number" min={40} max={240} value={tempoInput} disabled={isLoading} onBlur={() => setTempoInput(String(tempo))} onChange={(event) => {
                stopPlayback();
                setTempoInput(event.target.value);
              }} />
            </label>
            <label className={componentStyles.playbackFieldLabel}>
              Start measure
              <Select
                ariaLabel="Playback start measure"
                variant="field"
                popupSize="scrollable"
                className={componentStyles.playbackSelect}
                value={startMeasure}
                onValueChange={(value) => {
                  clearSelectedNote();
                  setStartMeasure(Number(value));
                }}
                options={Array.from({ length: measureCount }, (_, index) => ({ value: index + 1, label: index + 1 }))}
              />
            </label>
            <div className={componentStyles.playbackTransport}>
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
                <span>{isLoading ? "Preparing…" : isPlaying ? "Stop preview" : isPaused ? "Resume preview" : "Play preview"}</span>
              </button>
              <span className={componentStyles.playbackStatus}>
                {isPlaying ? "Playing" : isPaused ? "Paused" : "Hear the melody and harmony."}
              </span>
            </div>
          </div>
        </div>
        {(saveAction || publishAction) && (
          <div className={componentStyles.songActions}>
            {saveAction}
            {publishAction}
          </div>
        )}
      </aside>
    </div>
  );
}
