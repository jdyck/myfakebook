import type { Story } from "@ladle/react";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { HeaderMemberNavigation, HeaderView } from "./header-view";
import { headerFixtures } from "./header.fixtures";
import authStyles from "./auth-controls.module.css";
import { SettingsButton } from "./settings-button";

function HeaderExample({ signedIn, activeSection }: typeof headerFixtures[keyof typeof headerFixtures]) {
  return (
    <HeaderView
      activeSection={activeSection}
      memberNavigation={signedIn && <HeaderMemberNavigation activeSection={activeSection} />}
      mobileAccountControls={signedIn ? <><button type="button">Manage account</button><button type="button">Sign out</button></> : undefined}
      accountControls={
        <>
          {!signedIn && (
            <>
              <Link className={authStyles.signInButton} href="/sign-in">Sign in</Link>
              <Link className={authStyles.createAccountButton} href="/sign-up">
                <UserRound size={13} strokeWidth={1.8} />
                Create account
              </Link>
            </>
          )}
          {signedIn && <SettingsButton onAccountClick={() => {}} onSignOut={() => {}} />}
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
