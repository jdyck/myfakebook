import type { Story } from "@ladle/react";
import { SongHeading } from "./song-heading";
import { songHeadingFixtures } from "./song-heading.fixtures";

export const Unsaved: Story = () => <SongHeading {...songHeadingFixtures.unsaved} />;
export const Private: Story = () => <SongHeading {...songHeadingFixtures.private} />;
export const Published: Story = () => <SongHeading {...songHeadingFixtures.published} />;
export const LongTitle: Story = () => <SongHeading {...songHeadingFixtures.longTitle} />;

LongTitle.meta = { previewLayout: "sidebar" };
