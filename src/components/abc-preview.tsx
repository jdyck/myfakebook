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
      <div
        className="relative min-h-[480px] flex-1 overflow-auto rounded-[8px] border border-[var(--line)] bg-[#fffefb] px-3.5 py-[18px] [scrollbar-color:#d1d1cb_transparent] dark:bg-[#f7f4e9] max-[720px]:min-h-[390px]"
        aria-label="Rendered lead sheet"
      >
        <div>
          <div
            ref={targetRef}
            className={`min-w-[500px] px-2 pb-3.5 pt-2.5 [&_svg]:overflow-visible [&_svg]:text-[#252631] ${error ? "hidden" : ""}`}
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
        <div className="flex items-center gap-2">
          <button
            aria-label={isPlaying ? "Stop playback" : "Play lead sheet"}
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
          <span className="text-[10px] font-[650] text-[var(--muted)]">{isPlaying ? "Playing" : "Play preview"}</span>
        </div>
      </div>
    </>
  );
}
