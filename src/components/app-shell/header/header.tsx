"use client";

import { Show } from "@clerk/nextjs";
import { Music2 } from "lucide-react";
import Link from "next/link";

import { AuthControls } from "@/components/app-shell/header/auth-controls";
import { ThemeToggle } from "@/components/app-shell/header/theme-toggle";
import componentStyles from "./header.module.css";

type HeaderProps = {
  clerkConfigured: boolean;
};

export function Header({ clerkConfigured }: HeaderProps) {
  return (
    <header className={componentStyles.siteHeader}>
      <div className={componentStyles.brandIdentity}>
        <div className={componentStyles.brandIcon} aria-hidden="true">
          <Music2 size={17} strokeWidth={2.2} />
        </div>
        <span className={componentStyles.brandName}>MyFakeBook</span>
      </div>
      <div className={componentStyles.headerTools}>
        <nav aria-label="Main navigation" className={componentStyles.primaryNavigation}>
          <Link className={componentStyles.navigationLink} href="/songs">
            Songs
          </Link>
          {clerkConfigured && (
            <Show when="signed-in">
              <Link className={componentStyles.navigationLink} href="/mylibrary">
                My Library
              </Link>
              <Link className={componentStyles.navigationLink} href="/setlists">
                Binders
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
