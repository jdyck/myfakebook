"use client";

import { LogIn, UserRound } from "lucide-react";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export function AuthControls({ configured }: { configured: boolean }) {
  if (!configured) {
    return (
      <Link
        className="inline-flex min-h-8 cursor-pointer items-center justify-center gap-[7px] rounded-[8px] border border-[var(--line-strong)] px-[11px] text-[11px] font-[650] text-[var(--muted)] no-underline transition-[border-color,color] duration-[160ms] ease-in-out hover:border-[var(--accent)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        href="/sign-in"
      >
        <LogIn size={13} strokeWidth={1.8} />
        Sign in
      </Link>
    );
  }

  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button
            className="inline-flex min-h-[34px] cursor-pointer items-center justify-center gap-[7px] rounded-[8px] border border-transparent bg-transparent px-[11px] text-[11px] font-[650] text-[var(--muted)] transition-[background-color,color,opacity] duration-[160ms] ease-in-out hover:bg-[var(--paper-soft)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-[0.55]"
            type="button"
          >
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button
            className="inline-flex min-h-[34px] cursor-pointer items-center justify-center gap-[7px] rounded-[8px] border border-[var(--line-strong)] bg-[var(--paper)] px-[11px] text-[11px] font-[650] text-[var(--muted)] transition-[border-color,color,opacity] duration-[160ms] ease-in-out hover:border-[var(--accent)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-[0.55]"
            type="button"
          >
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
