import type { GlobalProvider } from "@ladle/react";
import { ThemeState } from "@ladle/react";
import { useLayoutEffect } from "react";

import "@fontsource-variable/inter";
import "@fontsource-variable/roboto-mono";
import "@fontsource-variable/roboto-flex";
import "../src/styles/globals.css";
import styles from "./preview.module.css";

export const Provider: GlobalProvider = ({ children, globalState, storyMeta }) => {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previousTheme = root.getAttribute("data-theme");
    const hadShell = root.classList.contains(styles.shell);

    // Portals mounted in document.body must share the story's theme and fonts.
    root.setAttribute("data-theme", globalState.theme === ThemeState.Dark ? "dark" : "light");
    root.classList.add(styles.shell);

    return () => {
      if (previousTheme === null) root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", previousTheme);
      if (!hadShell) root.classList.remove(styles.shell);
    };
  }, [globalState.theme]);

  const layout = storyMeta?.previewLayout;
  const layoutClass = layout === "sidebar" ? styles.sidebar
    : layout === "fullscreen" ? styles.fullscreen : styles.padded;

  return <div className={`${styles.preview} ${layoutClass}`}>{children}</div>;
};
