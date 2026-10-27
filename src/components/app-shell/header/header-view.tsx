"use client";

import { useState, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import editorialStyles from "./editorial-header.module.css";

export type HeaderSection = "songs" | "library" | "binders";

type HeaderViewProps = {
  activeSection?: HeaderSection;
  memberNavigation?: ReactNode;
  accountControls?: ReactNode;
  mobileAccountControls?: ReactNode;
};

export function HeaderMemberNavigation({ activeSection }: { activeSection?: HeaderSection }) {
  return (
    <>
      <Link href="/mylibrary" aria-current={activeSection === "library" ? "page" : undefined}>My Library</Link>
      <Link href="/binders" aria-current={activeSection === "binders" ? "page" : undefined}>Binders</Link>
    </>
  );
}

export function HeaderView({ activeSection = "library", memberNavigation, accountControls, mobileAccountControls }: HeaderViewProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={editorialStyles.siteHeader}>
      <Link className={editorialStyles.brand} href="/" aria-label="MyFakeBook home"><span>My</span>FakeBook</Link>
      <p className={editorialStyles.caption}>COLLECT AND ORGANIZE<br />THE MUSIC YOU LOVE.</p>
      <nav aria-label="Main navigation" className={editorialStyles.navigation}>
        <Link href="/songs" aria-current={activeSection === "songs" ? "page" : undefined}>Songs</Link>
        {memberNavigation}
      </nav>
      <div className={editorialStyles.accountControls}>
        {accountControls}
      </div>
      <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Dialog.Trigger className={editorialStyles.menuButton} aria-label="Open menu">
          <Menu size={22} strokeWidth={1.8} aria-hidden="true" />
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop className={editorialStyles.menuBackdrop} />
          <Dialog.Popup className={editorialStyles.menuPanel}>
            <div className="flex items-center justify-between border-b border-line pb-4">
              <Dialog.Title className="text-lg font-semibold">Menu</Dialog.Title>
              <Dialog.Close className="flex min-h-touch min-w-11 cursor-pointer items-center justify-center hover:text-accent" aria-label="Close menu">
                <X size={22} aria-hidden="true" />
              </Dialog.Close>
            </div>
            <nav aria-label="Mobile navigation" className={editorialStyles.menuNavigation} onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) setMenuOpen(false);
            }}>
              <Link href="/songs" aria-current={activeSection === "songs" ? "page" : undefined}>Songs</Link>
              {memberNavigation}
            </nav>
            <div className={editorialStyles.menuAccountControls}>
              <p className="w-full text-xs font-semibold text-muted">Account</p>
              {mobileAccountControls ?? accountControls}
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </header>
  );
}
