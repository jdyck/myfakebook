import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { auth, redirect } = vi.hoisted(() => ({ auth: vi.fn(), redirect: vi.fn() }));

vi.mock("@clerk/nextjs/server", () => ({ auth }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/components/workspace/my-library-list", () => ({
  MyLibraryListBacked: () => null,
  MyLibraryList: () => null,
}));

import MyLibraryPage from "./page";
import { MyLibraryListBacked } from "@/components/workspace/my-library-list";

describe("My Library page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_myfakebook");
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://example.convex.cloud");
    auth.mockResolvedValue({ userId: "user_1" });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("shows the saved-song list for a signed-in user", async () => {
    expect(await MyLibraryPage()).toMatchObject({ type: MyLibraryListBacked });
  });

  it("sends guests to Songs", async () => {
    auth.mockResolvedValue({ userId: null });
    await MyLibraryPage();
    expect(redirect).toHaveBeenCalledWith("/songs");
  });
});
