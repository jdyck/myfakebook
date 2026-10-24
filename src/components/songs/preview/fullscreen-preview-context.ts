"use client";

import { createContext } from "react";

export type FullscreenPreviewAction = {
  onFullscreen: (button: HTMLButtonElement) => void;
  disabled: boolean;
  onZoom?: () => void;
  zoomed?: boolean;
};

export const FullscreenPreviewContext = createContext<FullscreenPreviewAction | null>(null);
