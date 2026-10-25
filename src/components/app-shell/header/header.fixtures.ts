import type { HeaderSection } from "./header-view";

type HeaderFixture = { signedIn: boolean; activeSection: HeaderSection };

export const headerFixtures = {
  guest: { signedIn: false, activeSection: "songs" },
  songs: { signedIn: true, activeSection: "songs" },
  library: { signedIn: true, activeSection: "library" },
  binders: { signedIn: true, activeSection: "binders" },
} satisfies Record<string, HeaderFixture>;
