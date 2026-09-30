"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Music2, X } from "lucide-react";

import { AbcPreview } from "@/components/songs/preview/abc-preview";
import type { SongDisplaySettings } from "@/lib/abc-display";
import componentStyles from "./preview-panel.module.css";

type PreviewPanelProps = {
  abc: string;
  displaySettings: SongDisplaySettings;
  saveAction: ReactNode;
  publishAction: ReactNode;
  onRenderedSvg: (svg: SVGSVGElement | null) => void;
};

export function PreviewPanel({ abc, displaySettings, saveAction, publishAction, onRenderedSvg }: PreviewPanelProps) {
  const [renderedSvg, setRenderedSvg] = useState<SVGSVGElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenCanvasRef = useRef<HTMLDivElement>(null);
  const fullscreenButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onRenderedSvgRef = useRef(onRenderedSvg);
  onRenderedSvgRef.current = onRenderedSvg;

  const handleRenderedSvg = useCallback((svg: SVGSVGElement | null) => {
    setRenderedSvg(svg);
    onRenderedSvgRef.current(svg);
  }, []);

  const openFullscreen = useCallback(() => {
    setIsFullscreen(true);
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => undefined);
    }
  }, []);

  const closeFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
    setIsFullscreen(false);
    window.requestAnimationFrame(() => fullscreenButtonRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!isFullscreen || !renderedSvg || !fullscreenCanvasRef.current) return;

    const viewBox = renderedSvg.viewBox.baseVal;
    if (!viewBox.width || !viewBox.height) return;

    const clone = renderedSvg.cloneNode(true) as SVGSVGElement;
    clone.classList.add(componentStyles.fullscreenSvg);
    clone.setAttribute("preserveAspectRatio", "xMidYMid meet");
    clone.style.position = "static";
    clone.style.inset = "auto";
    clone.style.display = "block";
    clone.style.color = window.getComputedStyle(renderedSvg).color;
    clone.style.backgroundColor = "transparent";

    const page = document.createElement("div");
    page.className = componentStyles.fullscreenPage;
    page.appendChild(clone);

    const availableCanvas = fullscreenCanvasRef.current;
    const originalPreview = renderedSvg.closest(".abcjs-preview");
    availableCanvas.classList.toggle(
      "abc-preview-hide-chords",
      Boolean(originalPreview?.classList.contains("abc-preview-hide-chords")),
    );
    availableCanvas.classList.toggle(
      "abc-preview-hide-lyrics",
      Boolean(originalPreview?.classList.contains("abc-preview-hide-lyrics")),
    );
    availableCanvas.replaceChildren(page);
    const pagePadding = Number.parseFloat(window.getComputedStyle(page).paddingLeft);

    const fitScoreToScreen = () => {
      const maxWidth = Math.max(1, window.innerWidth - 40);
      const maxHeight = Math.max(1, window.innerHeight - 88);
      const maxScoreWidth = Math.max(1, maxWidth - pagePadding * 2);
      const maxScoreHeight = Math.max(1, maxHeight - pagePadding * 2);
      const scale = Math.min(maxScoreWidth / viewBox.width, maxScoreHeight / viewBox.height);
      const scoreWidth = viewBox.width * scale;
      const scoreHeight = viewBox.height * scale;
      clone.style.width = `${scoreWidth}px`;
      clone.style.height = `${scoreHeight}px`;
      page.style.width = `${scoreWidth + pagePadding * 2}px`;
      page.style.height = `${scoreHeight + pagePadding * 2}px`;
    };

    fitScoreToScreen();
    window.addEventListener("resize", fitScoreToScreen);

    return () => {
      window.removeEventListener("resize", fitScoreToScreen);
      availableCanvas.replaceChildren();
    };
  }, [
    displaySettings.showChords,
    displaySettings.showLyrics,
    displaySettings.showParts,
    isFullscreen,
    renderedSvg,
  ]);

  useEffect(() => {
    if (!isFullscreen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeFullscreen();
    };
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) closeFullscreen();
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [closeFullscreen, isFullscreen]);

  return (
    <section
      className={componentStyles.previewPanel}
      aria-label="Lead sheet preview"
    >
      <div className={componentStyles.previewHeader}>
        <div className={componentStyles.previewHeading}>
          <Music2 className={componentStyles.previewIcon} size={15} strokeWidth={1.8} />
          Preview
        </div>
        <button
          ref={fullscreenButtonRef}
          aria-label="Open fullscreen preview"
          className={componentStyles.fullscreenButton}
          disabled={!renderedSvg}
          title="Open fullscreen preview"
          type="button"
          onClick={openFullscreen}
        >
          <Maximize2 aria-hidden="true" size={15} strokeWidth={1.8} />
        </button>
      </div>
      <div className={componentStyles.previewContent}>
        <AbcPreview
          abc={abc}
          key={abc}
          showChords={displaySettings.showChords}
          showLyrics={displaySettings.showLyrics}
          showParts={displaySettings.showParts ?? true}
          showFirstLineClefOnly={displaySettings.showFirstLineClefOnly ?? true}
          transposition={displaySettings.transposition}
          saveAction={saveAction}
          publishAction={publishAction}
          onRenderedSvg={handleRenderedSvg}
        />
      </div>
      {isFullscreen && typeof document !== "undefined" && createPortal(
        <div
          aria-label="Fullscreen lead sheet preview"
          aria-modal="true"
          className={componentStyles.fullscreenOverlay}
          role="dialog"
        >
          <div ref={fullscreenCanvasRef} className={`${componentStyles.fullscreenCanvas} abcjs-preview`} />
          <button
            ref={closeButtonRef}
            aria-label="Close fullscreen preview"
            className={componentStyles.closeFullscreenButton}
            title="Close fullscreen preview"
            type="button"
            onClick={closeFullscreen}
          >
            <X aria-hidden="true" size={20} strokeWidth={1.8} />
          </button>
        </div>,
        document.body,
      )}
    </section>
  );
}
