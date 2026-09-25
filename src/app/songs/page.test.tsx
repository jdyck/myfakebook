// @vitest-environment jsdom
// @vitest-environment-options {"url":"http://localhost:3000"}

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SongsPage from "./page";
import { PUBLIC_LIBRARY } from "@/lib/public-library";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("Songs page", () => {
  let container: HTMLDivElement | undefined;
  let unmount: (() => void) | undefined;

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "");
  });

  afterEach(async () => {
    if (unmount) {
      await act(async () => {
        unmount?.();
      });
    }
    container?.remove();
    vi.unstubAllEnvs();
    container = undefined;
    unmount = undefined;
  });

  it("renders the Songs list for a guest", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    unmount = () => root.unmount();

    await act(async () => {
      root.render(SongsPage());
    });

    expect(container.querySelector("#songs-heading")?.textContent).toBe("Songs");
    expect(container.textContent).toContain(PUBLIC_LIBRARY[0].title);
    expect(container.querySelector("textarea")).toBeNull();
    expect(container.querySelector("a[href='/songs/oh-lady-be-good']")?.textContent).toContain(PUBLIC_LIBRARY[0].title);
  });
});
