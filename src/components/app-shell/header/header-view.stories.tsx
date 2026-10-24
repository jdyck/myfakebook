import type { Story } from "@ladle/react";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { HeaderMemberNavigation, HeaderView } from "./header-view";
import { headerFixtures } from "./header.fixtures";
import authStyles from "./auth-controls.module.css";
import themeStyles from "./theme-toggle.module.css";

function HeaderExample({ signedIn, activeSection }: typeof headerFixtures[keyof typeof headerFixtures]) {
  return (
    <HeaderView
      activeSection={activeSection}
      memberNavigation={signedIn && <HeaderMemberNavigation activeSection={activeSection} />}
      accountControls={
        <>
          <button
            type="button"
            className={themeStyles.themeToggleButton}
            aria-label="Theme preview: use Ladle's theme toolbar"
            title="Use Ladle's theme toolbar to change the preview theme"
            disabled
          >
            <span className={themeStyles.darkLabel}>DARK</span>
            <span className={themeStyles.lightLabel}>LIGHT</span>
          </button>
          {signedIn ? (
            <span
              className="flex size-7 shrink-0 items-center justify-center bg-brand text-xs font-semibold text-on-accent"
              role="img"
              aria-label="Example account: Alex Morgan"
              title="Example account: Alex Morgan"
            >AM</span>
          ) : (
            <>
              <Link className={authStyles.signInButton} href="/sign-in">Sign in</Link>
              <Link className={authStyles.createAccountButton} href="/sign-up">
                <UserRound size={13} strokeWidth={1.8} />
                Create account
              </Link>
            </>
          )}
        </>
      }
    />
  );
}

export const Guest: Story = () => <HeaderExample {...headerFixtures.guest} />;
Guest.meta = { previewLayout: "fullscreen" };
export const SignedInSongs: Story = () => <HeaderExample {...headerFixtures.songs} />;
SignedInSongs.meta = { previewLayout: "fullscreen" };
export const SignedInLibrary: Story = () => <HeaderExample {...headerFixtures.library} />;
SignedInLibrary.meta = { previewLayout: "fullscreen" };
export const SignedInBinders: Story = () => <HeaderExample {...headerFixtures.binders} />;
SignedInBinders.meta = { previewLayout: "fullscreen" };
