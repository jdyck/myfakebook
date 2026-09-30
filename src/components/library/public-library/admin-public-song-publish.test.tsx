// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";

import type { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";

const mocks = vi.hoisted(() => ({
  setPublication: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock("convex/react", () => ({ useMutation: mocks.useMutation }));
vi.mock("@clerk/nextjs", () => ({ useUser: () => ({ user: { publicMetadata: { role: "admin" } } }) }));

import { AdminPublicationButton } from "./publication-actions";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  mocks.setPublication.mockReset();
  mocks.useMutation.mockReset();
});

it("publishes an admin's song without changing its ID", async () => {
  const songId = "song-id" as Id<"songs">;
  const onChanged = vi.fn();
  const onStatus = vi.fn();
  mocks.setPublication.mockResolvedValue(songId);
  mocks.useMutation.mockReturnValue(mocks.setPublication);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        <AdminPublicationButton
          enabled
          onChanged={onChanged}
          onStatus={onStatus}
          song={{ id: songId, title: "Autumn Song", abc: "T:Autumn Song\nK:C\nC D E F|", publicationState: "private" }}
        />,
      );
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[aria-label="Published: None"]')?.click();
      Array.from(document.querySelectorAll<HTMLElement>('[role="menuitemradio"]'))
        .find((item) => item.textContent?.includes("U.S."))
        ?.click();
    });

    expect(mocks.setPublication).toHaveBeenCalledExactlyOnceWith({ id: songId, publication: "US" });
    expect(mocks.useMutation).toHaveBeenCalledWith(api.songs.setPublication);
    expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({
      id: songId,
      publicationState: "published",
      publicationTerritory: "US",
    }));
    expect(onStatus).toHaveBeenLastCalledWith("Published U.S.");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
