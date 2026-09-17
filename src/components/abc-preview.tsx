"use client";

import { useEffect, useRef, useState } from "react";
import ABCJS from "abcjs";
import { LoaderCircle, Play, Square } from "lucide-react";

type Synth = {
  init: (options: {
    visualObj: ABCJS.TuneObject;
    options?: { soundFontUrl?: string; onEnded?: () => void };
  }) => Promise<unknown>;
  prime: () => Promise<unknown>;
  start: () => void;
  stop: () => number;
  getIsRunning: () => boolean;
};

export function AbcPreview({ abc }: { abc: string }) {
  const targetRef = useRef<HTMLDivElement>(null);
  const tuneRef = useRef<ABCJS.TuneObject | null>(null);
  const synthRef = useRef<Synth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (synthRef.current?.getIsRunning()) synthRef.current.stop();
    synthRef.current = null;
    let errorTimeout: number | undefined;
    const scheduleError = (message: string) => {
      errorTimeout = window.setTimeout(() => setError(message), 0);
    };

    if (!targetRef.current || !abc.trim()) {
      scheduleError("Add ABC notation to see the staff preview.");
      return () => {
        if (errorTimeout) window.clearTimeout(errorTimeout);
      };
    }

    targetRef.current.innerHTML = "";
    try {
      const rendered = ABCJS.renderAbc(targetRef.current, abc, {
        add_classes: true,
        foregroundColor: "#252631",
        paddingbottom: 4,
        paddingleft: 2,
        paddingright: 2,
        paddingtop: 5,
        responsive: "resize",
        scale: 1.06,
        staffwidth: 720,
      });
      tuneRef.current = rendered[0];
    } catch (renderError) {
      tuneRef.current = null;
      scheduleError(renderError instanceof Error ? renderError.message : "ABC could not be rendered.");
    }

    return () => {
      if (errorTimeout) window.clearTimeout(errorTimeout);
      if (synthRef.current?.getIsRunning()) synthRef.current.stop();
    };
  }, [abc]);

  async function togglePlayback() {
    if (synthRef.current?.getIsRunning()) {
      synthRef.current.stop();
      setIsPlaying(false);
      return;
    }
    if (!tuneRef.current || isLoading) return;

    setIsLoading(true);
    try {
      const synth = new ABCJS.synth.CreateSynth() as Synth;
      await synth.init({
        visualObj: tuneRef.current,
        options: {
          onEnded: () => setIsPlaying(false),
          soundFontUrl: "https://paulrosen.github.io/midi-js-soundfonts/FluidR3_GM/",
        },
      });
      await synth.prime();
      synthRef.current = synth;
      synth.start();
      setIsPlaying(true);
    } catch (playbackError) {
      setError(playbackError instanceof Error ? playbackError.message : "Audio preview is unavailable.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="sheet-paper" aria-label="Rendered lead sheet">
        <div ref={targetRef} className={`abcjs-container${error ? " is-hidden" : ""}`} />
        {error && (
          <div className="preview-error">
            <div>
              {error}
              <code>Check the ABC header and note syntax.</code>
            </div>
          </div>
        )}
      </div>
      <div className="transport">
        <div className="transport-left">
          <button
            aria-label={isPlaying ? "Stop playback" : "Play lead sheet"}
            className="transport-button"
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
          <span className="transport-label">{isPlaying ? "Playing" : "Play preview"}</span>
        </div>
      </div>
    </>
  );
}
