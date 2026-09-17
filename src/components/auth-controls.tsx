"use client";

import { LogIn, UserRound } from "lucide-react";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export function AuthControls({ configured }: { configured: boolean }) {
  if (!configured) {
    return (
      <Link className="clerk-fallback" href="/sign-in">
        <LogIn size={13} strokeWidth={1.8} />
        Sign in
      </Link>
    );
  }

  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button className="button-ghost" type="button">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="button-secondary" type="button">
            <UserRound size={13} strokeWidth={1.8} />
            Create account
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </>
  );
}
