"use client";

import { Show } from "@clerk/nextjs";
import Link from "next/link";

import { AuthControls } from "@/components/app-shell/header/auth-controls";
import { ThemeToggle } from "@/components/app-shell/header/theme-toggle";
import editorialStyles from "./editorial-header.module.css";

type HeaderProps = {
  clerkConfigured: boolean;
  activeSection?: "songs" | "library" | "binders";
};

export function Header({ clerkConfigured, activeSection = "library" }: HeaderProps) {
  return (
    <header className={editorialStyles.siteHeader}>
      <Link className={editorialStyles.brand} href="/" aria-label="MyFakeBook home"><span>My</span>FakeBook</Link>
      <p className={editorialStyles.caption}>A MODERN HOME<br />FOR THE GREAT SONGS.</p>
      <nav aria-label="Main navigation" className={editorialStyles.navigation}>
        <Link href="/songs" aria-current={activeSection === "songs" ? "page" : undefined}>Songs</Link>
        {clerkConfigured && <Show when="signed-in">
          <Link href="/mylibrary" aria-current={activeSection === "library" ? "page" : undefined}>My Library</Link>
          <Link href="/binders" aria-current={activeSection === "binders" ? "page" : undefined}>Binders</Link>
        </Show>}
      </nav>
      <div className={editorialStyles.accountControls}>
        <ThemeToggle />
        <AuthControls configured={clerkConfigured} />
      </div>
    </header>
  );
}
