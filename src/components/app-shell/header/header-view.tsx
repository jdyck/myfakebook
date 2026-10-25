import type { ReactNode } from "react";
import Link from "next/link";
import editorialStyles from "./editorial-header.module.css";

export type HeaderSection = "songs" | "library" | "binders";

type HeaderViewProps = {
  activeSection?: HeaderSection;
  memberNavigation?: ReactNode;
  accountControls?: ReactNode;
};

export function HeaderMemberNavigation({ activeSection }: { activeSection?: HeaderSection }) {
  return (
    <>
      <Link href="/mylibrary" aria-current={activeSection === "library" ? "page" : undefined}>My Library</Link>
      <Link href="/binders" aria-current={activeSection === "binders" ? "page" : undefined}>Binders</Link>
    </>
  );
}

export function HeaderView({ activeSection = "library", memberNavigation, accountControls }: HeaderViewProps) {
  return (
    <header className={editorialStyles.siteHeader}>
      <Link className={editorialStyles.brand} href="/" aria-label="MyFakeBook home"><span>My</span>FakeBook</Link>
      <p className={editorialStyles.caption}>A MODERN HOME<br />FOR THE GREAT SONGS.</p>
      <nav aria-label="Main navigation" className={editorialStyles.navigation}>
        <Link href="/songs" aria-current={activeSection === "songs" ? "page" : undefined}>Songs</Link>
        {memberNavigation}
      </nav>
      <div className={editorialStyles.accountControls}>
        {accountControls}
      </div>
    </header>
  );
}
