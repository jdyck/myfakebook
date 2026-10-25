"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AbcPreview } from "@/components/songs/preview/abc-preview";
import styles from "./editor-preview.module.css";

function clampZoom(zoom: number) {
  return Math.min(4, Math.max(1, zoom));
}

export function EditorPreview({ abc }: { abc: string }) {
  const [zoom, setZoom] = useState(1);
  const [moved, setMoved] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0, scoreHeight: 0 });
  const drag = useRef<{ x: number; y: number; left: number; top: number; active: boolean } | null>(null);
  const suppressClick = useRef(false);
  const gestureZoom = useRef(1);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const score = scoreRef.current;
    if (!viewport || !score) return;
    function measure() {
      const next = { width: viewport!.clientWidth, height: viewport!.clientHeight, scoreHeight: score!.offsetHeight };
      setSize((current) => current.width === next.width && current.height === next.height && current.scoreHeight === next.scoreHeight ? current : next);
    }
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(viewport);
    observer?.observe(score);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const fitScale = size.height > 0 && size.scoreHeight > 0 ? Math.min(1, size.height / size.scoreHeight) : 1;
  const scale = fitScale * zoom;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    // React wheel listeners are passive, so use a native listener to cancel
    // browser zoom for trackpad pinches and Ctrl/Command + wheel here.
    function onWheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport!.clientHeight : 1);
      setZoom((current) => clampZoom(current * Math.exp(-delta * 0.01)));
    }

    // Safari exposes trackpad pinches as gesture events instead of wheel events.
    function onGestureStart(event: Event) {
      event.preventDefault();
      gestureZoom.current = zoom;
    }
    function onGestureChange(event: Event) {
      event.preventDefault();
      const scale = (event as Event & { scale: number }).scale;
      if (Number.isFinite(scale) && scale > 0) setZoom(clampZoom(gestureZoom.current * scale));
    }
    function onGestureEnd(event: Event) {
      event.preventDefault();
    }

    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("gesturestart", onGestureStart, { passive: false });
    viewport.addEventListener("gesturechange", onGestureChange, { passive: false });
    viewport.addEventListener("gestureend", onGestureEnd, { passive: false });
    return () => {
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("gesturestart", onGestureStart);
      viewport.removeEventListener("gesturechange", onGestureChange);
      viewport.removeEventListener("gestureend", onGestureEnd);
    };
  }, [zoom]);

  function changeZoom(next: number) {
    setZoom(clampZoom(Math.round(next * 100) / 100));
  }

  function fit() {
    setZoom(1);
    setMoved(false);
    viewportRef.current?.scrollTo({ left: 0, top: 0, behavior: "instant" });
  }

  return (
    <div className={styles.preview}>
      <div className={styles.controls} role="group" aria-label="Preview zoom">
        <Button variant="field" size="icon" aria-label="Zoom out" disabled={zoom === 1} onClick={() => changeZoom(zoom - 0.25)}><Minus size={16} /></Button>
        <output aria-label="Preview zoom level">{Math.round(zoom * 100)}%</output>
        <Button variant="field" size="icon" aria-label="Zoom in" disabled={zoom === 4} onClick={() => changeZoom(zoom + 0.25)}><Plus size={16} /></Button>
        {(zoom !== 1 || moved) && <Button variant="field" onClick={fit}>Fit preview</Button>}
      </div>
      <div
        ref={viewportRef}
        className={styles.viewport}
        tabIndex={0}
        aria-label="Song preview. Use zoom buttons to enlarge, then drag or scroll to pan."
        onScroll={(event) => setMoved(event.currentTarget.scrollLeft > 0 || event.currentTarget.scrollTop > 0)}
        onPointerDown={(event) => {
          if (event.button !== 0 || event.pointerType === "touch") return;
          suppressClick.current = false;
          drag.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop, active: false };
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (!start.active && Math.hypot(dx, dy) < 5) return;
          start.active = true;
          suppressClick.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          event.currentTarget.scrollLeft = start.left - dx;
          event.currentTarget.scrollTop = start.top - dy;
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
        onLostPointerCapture={() => { drag.current = null; }}
        onClickCapture={(event) => {
          if (suppressClick.current) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }
        }}
      >
        <div className={styles.stage} style={{ width: size.width ? Math.max(size.width, size.width * scale) : "100%", height: size.scoreHeight * scale }}>
          <div ref={scoreRef} className={styles.score} style={{ width: size.width || "100%", transform: `scale(${scale})`, left: Math.max(0, (size.width - size.width * scale) / 2) }}>
            <AbcPreview abc={abc} />
          </div>
        </div>
      </div>
    </div>
  );
}
