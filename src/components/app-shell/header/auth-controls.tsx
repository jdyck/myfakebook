"use client";

import { LogIn, UserRound } from "lucide-react";
import { Show, SignInButton, SignUpButton, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { SettingsButton } from "./settings-button";
import componentStyles from "./auth-controls.module.css";

export function AuthControls({ configured }: { configured: boolean }) {
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
        <SettingsButton />
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
        <SettingsButton />
      </Show>
      <Show when="signed-in">
        <AccountSettings />
      </Show>
    </>
  );
}

function AccountSettings() {
  const { openUserProfile, signOut } = useClerk();

  return <SettingsButton onAccountClick={() => openUserProfile()} onSignOut={() => { void signOut({ redirectUrl: "/songs" }); }} />;
}
