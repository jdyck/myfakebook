"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { AbcPreview } from "@/components/songs/preview/abc-preview";
import { FullscreenPreviewContext } from "@/components/songs/preview/fullscreen-preview-context";
import type { SongDisplaySettings } from "@/lib/abc-display";
import componentStyles from "./preview-panel.module.css";

type PreviewPanelProps = {
  abc: string;
  displaySettings: SongDisplaySettings;
  workspaceToolbar?: ReactNode;
  displayControls?: ReactNode;
  saveAction?: ReactNode;
  publishAction?: ReactNode;
  onRenderedSvg?: (svg: SVGSVGElement | null) => void;
};

export function PreviewPanel({ abc, displaySettings, workspaceToolbar, displayControls, saveAction, publishAction, onRenderedSvg }: PreviewPanelProps) {
  const [renderedSvg, setRenderedSvg] = useState<SVGSVGElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenCanvasRef = useRef<HTMLDivElement>(null);
  const fullscreenButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const handleRenderedSvg = useCallback((svg: SVGSVGElement | null) => {
    setRenderedSvg(svg);
    onRenderedSvg?.(svg);
  }, [onRenderedSvg]);

  const openFullscreen = useCallback((button: HTMLButtonElement) => {
    fullscreenButtonRef.current = button;
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
      const pageWidth = Math.min(816, maxWidth, maxHeight * (8.5 / 11));
      const pageHeight = pageWidth * (11 / 8.5);
      const maxScoreWidth = Math.max(1, pageWidth - pagePadding * 2);
      const maxScoreHeight = Math.max(1, pageHeight - pagePadding * 2);
      const scale = Math.min(maxScoreWidth / viewBox.width, maxScoreHeight / viewBox.height);
      const scoreWidth = viewBox.width * scale;
      const scoreHeight = viewBox.height * scale;
      clone.style.width = `${scoreWidth}px`;
      clone.style.height = `${scoreHeight}px`;
      page.style.width = `${pageWidth}px`;
      page.style.height = `${pageHeight}px`;
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
      className={componentStyles.previewWorkspace}
      aria-label="Lead sheet preview"
    >
      <FullscreenPreviewContext.Provider
        value={{ onFullscreen: openFullscreen, disabled: !renderedSvg }}
      >
        <AbcPreview
          abc={abc}
          key={abc}
          showChords={displaySettings.showChords}
          showLyrics={displaySettings.showLyrics}
          showParts={displaySettings.showParts ?? true}
          showFirstLineClefOnly={displaySettings.showFirstLineClefOnly ?? true}
          transposition={displaySettings.transposition}
          workspaceToolbar={workspaceToolbar}
          displayControls={displayControls}
          saveAction={saveAction}
          publishAction={publishAction}
          onRenderedSvg={handleRenderedSvg}
        />
      </FullscreenPreviewContext.Provider>
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
