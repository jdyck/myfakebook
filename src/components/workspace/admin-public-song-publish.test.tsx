// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";

import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";

const mocks = vi.hoisted(() => ({
  publish: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock("convex/react", () => ({ useMutation: mocks.useMutation }));
vi.mock("@clerk/nextjs", () => ({ useUser: () => ({ user: { publicMetadata: { role: "admin" } } }) }));

import { AdminPublicationButton } from "./song-persistence";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  mocks.publish.mockReset();
  mocks.useMutation.mockReset();
});

it("publishes an admin's song without changing its ID", async () => {
  const songId = "song-id" as Id<"songs">;
  const onChanged = vi.fn();
  const onStatus = vi.fn();
  mocks.publish.mockResolvedValue(songId);
  mocks.useMutation.mockReturnValue(mocks.publish);
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
      container.querySelector<HTMLButtonElement>('button[aria-label="Publish Autumn Song"]')?.click();
    });

    expect(mocks.publish).toHaveBeenCalledExactlyOnceWith({ id: songId });
    expect(mocks.useMutation).toHaveBeenCalledWith(api.songs.publish);
    expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ id: songId, publicationState: "published" }));
    expect(onStatus).toHaveBeenLastCalledWith("Published to Public Library");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
