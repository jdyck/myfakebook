// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mutation: vi.fn().mockResolvedValue("score-id"),
  privateSongs: [] as Array<{ _id: string; title: string; abc: string; updatedAt: number; publicationState: "private" | "published" }>,
}));

vi.mock("convex/react", () => ({
  Authenticated: ({ children }: { children: ReactNode }) => children,
  Unauthenticated: () => null,
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  useMutation: () => mocks.mutation,
  useQuery: () => mocks.privateSongs,
}));

vi.mock("@clerk/nextjs", () => ({
  Show: ({ children }: { children: ReactNode }) => children,
  SignInButton: ({ children }: { children: ReactNode }) => children,
  SignUpButton: ({ children }: { children: ReactNode }) => children,
  UserButton: () => null,
  useUser: () => ({ user: { publicMetadata: {} } }),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { MyFakebookWorkspace } from "./my-fakebook-workspace";
import { PUBLIC_LIBRARY } from "@/lib/public-library";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("library song deletion", () => {
  let container: HTMLDivElement | undefined;
  let unmount: (() => void) | undefined;

  afterEach(async () => {
    if (unmount) {
      await act(async () => {
        unmount?.();
      });
    }
    container?.remove();
    window.localStorage?.clear();
    mocks.mutation.mockClear();
    mocks.privateSongs = [];
    vi.restoreAllMocks();
    container = undefined;
    unmount = undefined;
  });

  it("opens the last remaining library song after removing the current song", async () => {
    const firstSong = {
      _id: "first-score",
      title: "First Saved Song",
      abc: PUBLIC_LIBRARY[0].abc.replace("T:Oh, Lady Be Good!", "T:First Saved Song"),
      updatedAt: 1,
      publicationState: "private" as const,
    };
    const secondSong = {
      _id: "second-score",
      title: "Second Saved Song",
      abc: PUBLIC_LIBRARY[0].abc.replace("T:Oh, Lady Be Good!", "T:Second Saved Song"),
      updatedAt: 2,
      publicationState: "private" as const,
    };
    const thirdSong = {
      _id: "third-score",
      title: "Third Saved Song",
      abc: PUBLIC_LIBRARY[0].abc.replace("T:Oh, Lady Be Good!", "T:Third Saved Song"),
      updatedAt: 3,
      publicationState: "private" as const,
    };
    mocks.privateSongs = [thirdSong, secondSong, firstSong];

    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    unmount = () => root.unmount();

    await act(async () => {
      root.render(
        <MyFakebookWorkspace
          publicSongs={PUBLIC_LIBRARY}
          clerkConfigured={false}
          persistenceEnabled
        />,
      );
    });

    const workspaceGrid = container.querySelector("aside")?.parentElement;
    expect(workspaceGrid?.className).toContain("grid-cols-[208px_minmax(0,1fr)]");
    expect(workspaceGrid?.className).not.toContain("grid-cols-[minmax(0,1fr)]");

    const savedSongButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('aside button'),
    );
    await act(async () => {
      savedSongButtons[1]?.click();
      savedSongButtons[0]?.click();
    });

    await act(async () => {
      container
        ?.querySelector<HTMLButtonElement>('button[aria-label="Remove Third Saved Song from My Library"]')
        ?.click();
      await Promise.resolve();
    });

    expect(container.querySelector<HTMLInputElement>('input[aria-label="Lead sheet title"]')?.value).toBe(
      "Second Saved Song",
    );
    expect(container.querySelector<HTMLTextAreaElement>('textarea[aria-label="ABC notation source"]')?.value).toContain(
      "T:Second Saved Song",
    );
  });
});
