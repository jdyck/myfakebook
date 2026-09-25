// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";

import type { Id } from "../../../convex/_generated/dataModel";

const mocks = vi.hoisted(() => ({
  unpublish: vi.fn(),
  push: vi.fn(),
}));

vi.mock("convex/react", () => ({ useMutation: () => mocks.unpublish }));
vi.mock("@clerk/nextjs", () => ({ useUser: () => ({ user: { publicMetadata: { role: "admin" } } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

import { AdminUnpublishPublicSongButton } from "./song-persistence";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  mocks.unpublish.mockReset();
  mocks.push.mockReset();
});

it("keeps an unpublished song in My Library", async () => {
  const songId = "song-id" as Id<"songs">;
  const onStatus = vi.fn();
  mocks.unpublish.mockResolvedValue(songId);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(<AdminUnpublishPublicSongButton enabled songId={songId} onStatus={onStatus} />);
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[aria-label="Unpublish public song"]')?.click();
    });

    expect(mocks.unpublish).toHaveBeenCalledExactlyOnceWith({ id: songId });
    expect(mocks.push).toHaveBeenCalledExactlyOnceWith(`/mylibrary/${songId}`);
    expect(onStatus).toHaveBeenLastCalledWith("Song is private");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
