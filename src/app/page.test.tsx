import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { auth, redirect } = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/components/workspace/my-fakebook-workspace", () => ({
  MyFakebookWorkspace: () => null,
}));
vi.mock("@/components/workspace/public-library-backed-workspace", () => ({
  PublicLibraryBackedWorkspace: () => null,
}));

import Home from "./page";

describe("Home", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_myfakebook");
    auth.mockResolvedValue({ userId: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends a guest to the Songs page", async () => {
    await Home();

    expect(auth).toHaveBeenCalledOnce();
    expect(redirect).toHaveBeenCalledWith("/songs");
  });

  it("sends a signed-in user to My Library", async () => {
    auth.mockResolvedValue({ userId: "user_1" });

    await Home();

    expect(redirect).toHaveBeenCalledWith("/mylibrary");
  });
});
