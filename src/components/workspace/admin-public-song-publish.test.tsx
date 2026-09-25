// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";

import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";

const mocks = vi.hoisted(() => ({
  publish: vi.fn(),
  push: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock("convex/react", () => ({ useMutation: mocks.useMutation }));
vi.mock("@clerk/nextjs", () => ({ useUser: () => ({ user: { publicMetadata: { role: "admin" } } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

import { AdminPublishButton } from "./song-persistence";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  mocks.publish.mockReset();
  mocks.push.mockReset();
  mocks.useMutation.mockReset();
});

it("publishes an admin's private song and redirects to its public page", async () => {
  const privateSongId = "private-song" as Id<"privateSongs">;
  const publicSongId = "public-song" as Id<"publicSongs">;
  const onStatus = vi.fn();
  mocks.publish.mockResolvedValue(publicSongId);
  mocks.useMutation.mockReturnValue(mocks.publish);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        <AdminPublishButton
          enabled
          onStatus={onStatus}
          song={{ id: privateSongId, title: "Autumn Song", abc: "T:Autumn Song\nK:C\nC D E F|" }}
        />,
      );
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[aria-label="Publish Autumn Song to Public Library"]')?.click();
    });

    expect(mocks.publish).toHaveBeenCalledExactlyOnceWith({ privateSongId });
    expect(mocks.useMutation).toHaveBeenCalledWith(api.publicSongs.publishFromPrivateLibrary);
    expect(onStatus).toHaveBeenLastCalledWith("Published to Public Library");
    expect(mocks.push).toHaveBeenCalledExactlyOnceWith(`/songs/${publicSongId}`);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
