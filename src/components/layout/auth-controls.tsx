"use client";

import { LogIn, UserRound } from "lucide-react";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export function AuthControls({ configured }: { configured: boolean }) {
  if (!configured) {
    return (
      <Link
        className="inline-flex min-h-8 cursor-pointer items-center justify-center gap-1.75 rounded-[8px] border border-(--line-strong) px-2.75 text-[11px] font-[650] text-(--muted) no-underline transition-[border-color,color] duration-160 ease-in-out hover:border-(--accent) hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)"
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
            className="inline-flex min-h-8.5 cursor-pointer items-center justify-center gap-1.75 rounded-[8px] border border-transparent bg-transparent px-2.75 text-[11px] font-[650] text-(--muted) transition-[background-color,color,opacity] duration-160 ease-in-out hover:bg-(--paper-soft) hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent) disabled:opacity-[0.55]"
            type="button"
          >
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button
            className="inline-flex min-h-8.5 cursor-pointer items-center justify-center gap-1.75 rounded-[8px] border border-(--line-strong) bg-(--paper) px-2.75 text-[11px] font-[650] text-(--muted) transition-[border-color,color,opacity] duration-160 ease-in-out hover:border-(--accent) hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent) disabled:opacity-[0.55]"
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
