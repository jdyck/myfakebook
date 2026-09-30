// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";

import type { Id } from "../../../../convex/_generated/dataModel";

const mocks = vi.hoisted(() => ({
  setPublication: vi.fn(),
  push: vi.fn(),
}));

vi.mock("convex/react", () => ({ useMutation: () => mocks.setPublication }));
vi.mock("@clerk/nextjs", () => ({ useUser: () => ({ user: { publicMetadata: { role: "admin" } } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

import { AdminPublicSongPublicationMenu } from "./publication-actions";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  mocks.setPublication.mockReset();
  mocks.push.mockReset();
});

it("keeps an unpublished song in My Library", async () => {
  const songId = "song-id" as Id<"songs">;
  const onStatus = vi.fn();
  mocks.setPublication.mockResolvedValue(songId);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        <AdminPublicSongPublicationMenu
          enabled
          song={{ id: songId, title: "Autumn Song", abc: "T:Autumn Song\nK:C\nC D E F|", publicationState: "published" }}
          onStatus={onStatus}
        />,
      );
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[aria-label="Published: Worldwide"]')?.click();
      Array.from(document.querySelectorAll<HTMLElement>('[role="menuitemradio"]'))
        .find((item) => item.textContent?.includes("None"))
        ?.click();
    });

    expect(mocks.setPublication).toHaveBeenCalledExactlyOnceWith({ id: songId, publication: "none" });
    expect(mocks.push).toHaveBeenCalledExactlyOnceWith(`/mylibrary/${songId}`);
    expect(onStatus).toHaveBeenLastCalledWith("Song is private");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
