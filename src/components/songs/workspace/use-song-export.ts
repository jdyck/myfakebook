"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { abcToMusicXml } from "@/lib/notation/abc";
import type { SongDisplaySettings } from "@/lib/notation/abc-display";
import { downloadSongFile } from "@/lib/export/download-song-file";
import { svgToLetterPage, svgToPdf, svgToPng } from "@/lib/export/svg-pdf";

type SongExportOptions = {
  abc: string;
  songTitle: string;
  displaySettings: SongDisplaySettings;
  onStatus: (message: string | null) => void;
};

/** Owns download state and the rendered SVG snapshot for every export format. */
export function useSongExport({ abc, songTitle, displaySettings, onStatus }: SongExportOptions) {
  const [exporting, setExporting] = useState(false);
  const renderedSvgRef = useRef<SVGSVGElement | null>(null);
  const conversion = useMemo(() => {
    try {
      return abcToMusicXml(abc);
    } catch {
      return null;
    }
  }, [abc]);

  const handleRenderedSvg = useCallback((svg: SVGSVGElement | null) => {
    renderedSvgRef.current = svg;
  }, []);

  function createExportSvg() {
    const renderedSvg = renderedSvgRef.current;
    if (!renderedSvg) return null;

    const svg = renderedSvg.cloneNode(true) as SVGSVGElement;
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.querySelectorAll(".abcjs-note-playing, .abcjs-note-start-selected").forEach((element) => {
      element.classList.remove("abcjs-note-playing", "abcjs-note-start-selected");
    });
    if (!displaySettings.showChords) svg.querySelectorAll(".abcjs-chord").forEach((element) => element.remove());
    if (!displaySettings.showLyrics) svg.querySelectorAll(".abcjs-lyric").forEach((element) => element.remove());

    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = `
      text:not(.abcjs-chord), text:not(.abcjs-chord) tspan { font-family: Inter, Arial, sans-serif; }
      .abcjs-title, .abcjs-title tspan { font-weight: 700; }
      .abcjs-lyric, .abcjs-lyric tspan { font-weight: 300; }
      .abcjs-chord, .abcjs-chord tspan {
        font-family: "Bravura Chord Symbols", Inter, Arial, sans-serif;
        letter-spacing: -0.04em;
      }
    `;
    svg.insertBefore(style, svg.firstChild);

    return svg;
  }

  async function handleExport() {
    if (!conversion) {
      onStatus("Fix the ABC source before exporting");
      return;
    }
    setExporting(true);
    onStatus(null);
    try {
      const response = await fetch("/api/musicxml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ abc, display: displaySettings }),
      });
      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error ?? "MusicXML export failed.");
      }
      const blob = await response.blob();
      downloadSongFile(blob, songTitle, "musicxml");
      onStatus("MusicXML downloaded");
    } catch (error) {
      onStatus(error instanceof Error ? error.message : "MusicXML export failed");
    } finally {
      setExporting(false);
    }
  }

  function handleExportAbc() {
    try {
      const blob = new Blob([abc], { type: "text/vnd.abc;charset=utf-8" });
      downloadSongFile(blob, songTitle, "abc");
      onStatus("ABC downloaded");
    } catch (error) {
      onStatus(error instanceof Error ? error.message : "ABC export failed");
    }
  }

  function handleExportSvg() {
    const svg = createExportSvg();
    if (!svg) {
      onStatus("The lead sheet preview is not ready for SVG export");
      return;
    }

    try {
      const letterPage = svgToLetterPage(svg);
      const blob = new Blob([new XMLSerializer().serializeToString(letterPage)], { type: "image/svg+xml;charset=utf-8" });
      downloadSongFile(blob, songTitle, "svg");
      onStatus("SVG downloaded");
    } catch (error) {
      onStatus(error instanceof Error ? error.message : "SVG export failed");
    }
  }

  async function handleExportPng() {
    const svg = createExportSvg();
    if (!svg) {
      onStatus("The lead sheet preview is not ready for PNG export");
      return;
    }

    setExporting(true);
    onStatus(null);
    try {
      const png = await svgToPng(svg);
      downloadSongFile(png, songTitle, "png", 1000);
      onStatus("PNG downloaded");
    } catch (error) {
      onStatus(error instanceof Error ? error.message : "PNG export failed");
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPdf() {
    const svg = createExportSvg();
    if (!svg) {
      onStatus("The lead sheet preview is not ready for PDF export");
      return;
    }

    setExporting(true);
    try {
      const pdf = await svgToPdf(svg);
      downloadSongFile(pdf, songTitle, "pdf", 1000);
      onStatus("PDF downloaded");
    } catch (error) {
      onStatus(error instanceof Error ? error.message : "PDF export failed");
    } finally {
      setExporting(false);
    }
  }

  return {
    exporting,
    handleRenderedSvg,
    handleExport,
    handleExportAbc,
    handleExportSvg,
    handleExportPng,
    handleExportPdf,
  };
}
