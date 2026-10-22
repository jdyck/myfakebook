"use client";

import { createContext } from "react";

export type FullscreenPreviewAction = {
  onFullscreen: (button: HTMLButtonElement) => void;
  disabled: boolean;
};

export const FullscreenPreviewContext = createContext<FullscreenPreviewAction | null>(null);
