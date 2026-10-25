"use client";

import { Show } from "@clerk/nextjs";
import { AuthControls } from "./auth-controls";
import { HeaderMemberNavigation, HeaderView, type HeaderSection } from "./header-view";

type HeaderProps = {
  clerkConfigured: boolean;
  activeSection?: HeaderSection;
};

export function Header({ clerkConfigured, activeSection = "library" }: HeaderProps) {
  return (
    <HeaderView
      activeSection={activeSection}
      memberNavigation={clerkConfigured && (
        <Show when="signed-in">
          <HeaderMemberNavigation activeSection={activeSection} />
        </Show>
      )}
      accountControls={<AuthControls configured={clerkConfigured} />}
    />
  );
}
