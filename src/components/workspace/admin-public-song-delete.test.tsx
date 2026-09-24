// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mutation: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("convex/react", () => ({
  Authenticated: ({ children }: { children: ReactNode }) => children,
  Unauthenticated: () => null,
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  useMutation: () => mocks.mutation,
  useQuery: () => [],
}));

vi.mock("@clerk/nextjs", () => ({
  Show: ({ children }: { children: ReactNode }) => children,
  SignInButton: ({ children }: { children: ReactNode }) => children,
  SignUpButton: ({ children }: { children: ReactNode }) => children,
  UserButton: () => null,
  useUser: () => ({ user: { publicMetadata: { role: "admin" } } }),
}));

import { MyFakebookWorkspace } from "./my-fakebook-workspace";
import { PUBLIC_LIBRARY } from "@/lib/public-library";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("admin public-song deletion", () => {
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
    vi.restoreAllMocks();
    container = undefined;
    unmount = undefined;
  });

  it("opens the last remaining song after the admin deletes the current song", async () => {
    const firstSong = {
      ...PUBLIC_LIBRARY[0],
      id: "first-song",
      title: "First Song",
      abc: PUBLIC_LIBRARY[0].abc.replace("T:Oh, Lady Be Good!", "T:First Song"),
    };
    const secondSong = {
      ...PUBLIC_LIBRARY[0],
      id: "second-song",
      title: "Second Song",
      abc: PUBLIC_LIBRARY[0].abc.replace("T:Oh, Lady Be Good!", "T:Second Song"),
    };
    const thirdSong = {
      ...PUBLIC_LIBRARY[0],
      id: "third-song",
      title: "Third Song",
      abc: PUBLIC_LIBRARY[0].abc.replace("T:Oh, Lady Be Good!", "T:Third Song"),
    };

    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    unmount = () => root.unmount();

    await act(async () => {
      root.render(
        <MyFakebookWorkspace
          publicSongs={[firstSong, secondSong, thirdSong]}
          publicLibraryIsPersisted
          clerkConfigured={false}
          persistenceEnabled
        />,
      );
    });

    const publicLibraryButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('button[aria-pressed]'));
    await act(async () => {
      publicLibraryButtons[1]?.click();
      publicLibraryButtons[2]?.click();
    });

    await act(async () => {
      container?.querySelector<HTMLButtonElement>('button[aria-label="Delete public song"]')?.click();
      await Promise.resolve();
    });

    expect(container.querySelector<HTMLInputElement>('input[aria-label="Lead sheet title"]')?.value).toBe("Second Song");
    expect(container.querySelector<HTMLTextAreaElement>('textarea[aria-label="ABC notation source"]')?.value).toContain(
      "T:Second Song",
    );
  });
});
