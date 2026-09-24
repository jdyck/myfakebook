"use client";

import { Music2 } from "lucide-react";

import { AuthControls } from "@/components/layout/auth-controls";
import { ThemeToggle } from "@/components/layout/theme-toggle";

type HeaderProps = {
  clerkConfigured: boolean;
};

export function Header({ clerkConfigured }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex min-h-14.5 items-center justify-between border-b border-(--line) bg-(--paper) px-6 max-[720px]:min-h-13.5 max-[720px]:px-3.5">
      <div className="flex items-center gap-2.25">
        <div className="grid size-7 place-items-center rounded-[8px] bg-(--accent) text-white" aria-hidden="true">
          <Music2 size={17} strokeWidth={2.2} />
        </div>
        <span className="text-[15px] font-[760] tracking-tight text-foreground">MyFakebook</span>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <AuthControls configured={clerkConfigured} />
      </div>
    </header>
  );
}
