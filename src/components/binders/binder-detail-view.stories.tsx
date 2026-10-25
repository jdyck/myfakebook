import type { Story } from "@ladle/react";
import { useState } from "react";
import { BinderDetailView, type BinderDetailViewProps } from "./binder-detail-view";
import { binderFixtures } from "./binders.fixtures";
import type { Id } from "../../../convex/_generated/dataModel";
import { DEFAULT_DISPLAY_SETTINGS } from "@/lib/notation/abc-display";

function DetailExample({ empty = false, unavailable = false, fail = false }: { empty?: boolean; unavailable?: boolean; fail?: boolean }) {
  const [binder, setBinder] = useState<BinderDetailViewProps["binder"]>(() => ({
    ...binderFixtures.populated,
    items: empty ? [] : binderFixtures.populated.items.map((item, index) => unavailable && index === 0 ? { ...item, canOpen: false, abc: null } : item),
  }));
  function check() { if (fail) throw new Error("Couldn’t update binder. Please try again."); }
  return <BinderDetailView binder={binder} availableSongs={binderFixtures.availableSongs} loading={false}
    onDeleted={() => setBinder(null)}
    renameBinder={async ({ name }) => { check(); setBinder((current) => current && { ...current, name }); return binderFixtures.populated._id; }}
    removeBinder={async () => { check(); return binderFixtures.populated._id; }}
    addSong={async ({ songId }) => {
      check();
      const song = binderFixtures.availableSongs.find((song) => song.songId === songId)!;
      const source = binderFixtures.populated.items.find((item) => item.songId === songId)!;
      const id = `viewer-added-${songId}` as Id<"binderItems">;
      setBinder((current) => current && { ...current, items: [...current.items, { ...source, _id: id, title: song.title, position: current.items.length, displaySettings: DEFAULT_DISPLAY_SETTINGS }] });
      return id;
    }}
    removeItem={async ({ itemId }) => { check(); setBinder((current) => current && { ...current, items: current.items.filter((item) => item._id !== itemId) }); return itemId; }}
    reorder={async ({ itemIds }) => { check(); setBinder((current) => current && { ...current, items: itemIds.map((id) => current.items.find((item) => item._id === id)!) }); return binderFixtures.populated._id; }}
    updateDisplaySettings={async ({ itemId, displaySettings }) => { check(); setBinder((current) => current && { ...current, items: current.items.map((item) => item._id === itemId ? { ...item, displaySettings } : item) }); return itemId; }}
  />;
}
export const Populated: Story = () => <DetailExample />;
export const Empty: Story = () => <DetailExample empty />;
export const UnavailableSong: Story = () => <DetailExample unavailable />;
export const UpdateError: Story = () => <DetailExample fail />;
export const Loading: Story = () => <DetailState loading />;
export const NotFound: Story = () => <DetailState />;
function DetailState({ loading = false }: { loading?: boolean }) {
  const unused = async (): Promise<never> => { throw new Error("No binder selected"); };
  return <BinderDetailView binder={loading ? undefined : null} availableSongs={[]} loading={loading} onDeleted={() => {}} renameBinder={unused} removeBinder={unused} addSong={unused} removeItem={unused} reorder={unused} updateDisplaySettings={unused} />;
}
const config = { meta: { previewLayout: "fullscreen" } };
export default config;
