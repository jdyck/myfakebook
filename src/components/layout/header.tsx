"use client";

import { Show } from "@clerk/nextjs";
import { Music2 } from "lucide-react";
import Link from "next/link";

import { AuthControls } from "@/components/layout/auth-controls";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import componentStyles from "./header.module.css";

type HeaderProps = {
  clerkConfigured: boolean;
};

export function Header({ clerkConfigured }: HeaderProps) {
  return (
    <header className={componentStyles.style0}>
      <div className={componentStyles.style1}>
        <div className={componentStyles.style2} aria-hidden="true">
          <Music2 size={17} strokeWidth={2.2} />
        </div>
        <span className={componentStyles.style3}>MyFakebook</span>
      </div>
      <div className={componentStyles.style4}>
        <nav aria-label="Main navigation" className={componentStyles.style5}>
          <Link className={componentStyles.style6} href="/songs">
            Songs
          </Link>
          <Link className={componentStyles.style6} href="/new">
            New
          </Link>
          {clerkConfigured && (
            <Show when="signed-in">
              <Link className={componentStyles.style6} href="/mylibrary">
                My Library
              </Link>
              <Link className={componentStyles.style6} href="/setlists">
                Set lists
              </Link>
            </Show>
          )}
        </nav>
        <ThemeToggle />
        <AuthControls configured={clerkConfigured} />
      </div>
    </header>
  );
}
