import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({ signedIn: false }));

vi.mock("@clerk/nextjs", () => ({
  Show: ({ children, when }: { children: React.ReactNode; when: string }) =>
    authState.signedIn === (when === "signed-in") ? children : null,
}));
vi.mock("./auth-controls", () => ({ AuthControls: () => null }));
vi.mock("./theme-toggle", () => ({ ThemeToggle: () => null }));

import { Header } from "./header";

describe("Header navigation", () => {
  beforeEach(() => {
    authState.signedIn = false;
  });

  it("links guests to Songs without showing My Library", () => {
    const markup = renderToStaticMarkup(<Header clerkConfigured={true} />);
    expect(markup).toContain('href="/songs"');
    expect(markup).not.toContain('href="/mylibrary"');
  });

  it("links signed-in users to both Songs and My Library", () => {
    authState.signedIn = true;
    const markup = renderToStaticMarkup(<Header clerkConfigured={true} />);
    expect(markup).toContain('href="/songs"');
    expect(markup).toContain('href="/mylibrary"');
  });
});
