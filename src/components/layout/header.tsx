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
    <header className={componentStyles.siteHeader}>
      <div className={componentStyles.brandIdentity}>
        <div className={componentStyles.brandIcon} aria-hidden="true">
          <Music2 size={17} strokeWidth={2.2} />
        </div>
        <span className={componentStyles.brandName}>MyFakebook</span>
      </div>
      <div className={componentStyles.headerTools}>
        <nav aria-label="Main navigation" className={componentStyles.primaryNavigation}>
          <Link className={componentStyles.navigationLink} href="/songs">
            Songs
          </Link>
          <Link className={componentStyles.navigationLink} href="/new">
            New
          </Link>
          {clerkConfigured && (
            <Show when="signed-in">
              <Link className={componentStyles.navigationLink} href="/mylibrary">
                My Library
              </Link>
              <Link className={componentStyles.navigationLink} href="/setlists">
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
