"use client";

import { createContext } from "react";

type FullscreenPreviewAction = {
  onFullscreen: (button: HTMLButtonElement) => void;
  disabled: boolean;
  onZoom?: () => void;
  zoomed?: boolean;
};

export const FullscreenPreviewContext = createContext<FullscreenPreviewAction | null>(null);
