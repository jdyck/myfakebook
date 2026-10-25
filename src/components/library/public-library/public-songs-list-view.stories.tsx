import type { Story } from "@ladle/react";
import { PublicSongsListView } from "./public-songs-list-view";
import { publicSongsFixtures } from "./public-songs-list.fixtures";

export const Populated: Story = () => <PublicSongsListView songs={publicSongsFixtures.filter((song) => song.publicationTerritory === "worldwide")} />;
export const RegionalLibrary: Story = () => <PublicSongsListView songs={publicSongsFixtures} />;
export const AdminTerritories: Story = () => <PublicSongsListView songs={publicSongsFixtures} isAdmin />;
export const Empty: Story = () => <PublicSongsListView songs={[]} />;
export const Loading: Story = () => <PublicSongsListView songs={undefined} />;
const config = { meta: { previewLayout: "fullscreen" } };
export default config;
