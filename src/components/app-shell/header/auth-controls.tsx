"use client";

import { LogIn, UserRound } from "lucide-react";
import { Show, SignInButton, SignUpButton, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { SettingsButton } from "./settings-button";
import componentStyles from "./auth-controls.module.css";

export function AuthControls({ configured, mobileMenu = false }: { configured: boolean; mobileMenu?: boolean }) {
  if (!configured) {
    return (
      <>
        <Link
          className={componentStyles.signInLink}
          href="/sign-in"
        >
          <LogIn size={13} strokeWidth={1.8} />
          Sign in
        </Link>
      </>
    );
  }

  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button
            className={componentStyles.signInButton}
            type="button"
          >
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button
            className={componentStyles.createAccountButton}
            type="button"
          >
            <UserRound size={13} strokeWidth={1.8} />
            Create account
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <AccountSettings mobileMenu={mobileMenu} />
      </Show>
    </>
  );
}

function AccountSettings({ mobileMenu }: { mobileMenu: boolean }) {
  const { openUserProfile, signOut } = useClerk();

  if (mobileMenu) {
    return (
      <>
        <button type="button" onClick={() => openUserProfile()}>Manage account</button>
        <button type="button" onClick={() => { void signOut({ redirectUrl: "/songs" }); }}>Sign out</button>
      </>
    );
  }

  return <SettingsButton onAccountClick={() => openUserProfile()} onSignOut={() => { void signOut({ redirectUrl: "/songs" }); }} />;
}
