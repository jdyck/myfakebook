import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ signedIn: true }));
vi.mock("@clerk/nextjs", () => ({
  Show: ({ children, when }: { children: ReactNode; when: string }) => auth.signedIn === (when === "signed-in") ? children : null,
  SignInButton: ({ children }: { children: ReactNode }) => children,
  SignUpButton: ({ children }: { children: ReactNode }) => children,
  useClerk: () => ({ openUserProfile: vi.fn(), signOut: vi.fn() }),
}));

import { AuthControls } from "./auth-controls";

it("shows direct account buttons on mobile and settings on desktop for members", () => {
  auth.signedIn = true;
  const mobile = renderToStaticMarkup(<AuthControls configured mobileMenu />);
  expect(mobile).toContain("Manage account</button>");
  expect(mobile).toContain("Sign out</button>");
  expect(mobile).not.toContain('aria-label="Settings"');
  expect(renderToStaticMarkup(<AuthControls configured />)).toContain('aria-label="Settings"');
});

it("shows sign-in options without settings or member actions for guests", () => {
  auth.signedIn = false;
  const markup = renderToStaticMarkup(<AuthControls configured mobileMenu />);
  expect(markup).toContain("Sign in");
  expect(markup).toContain("Create account");
  expect(markup).not.toContain("Manage account");
  expect(markup).not.toContain('aria-label="Settings"');
});
