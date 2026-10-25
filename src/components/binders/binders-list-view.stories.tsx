import type { Story } from "@ladle/react";
import { useState } from "react";
import { BindersListView } from "./binders-list-view";
import { binderSummaries } from "./binders.fixtures";

function ListExample({ empty = false, fail = false }: { empty?: boolean; fail?: boolean }) {
  const [binders, setBinders] = useState(empty ? [] : binderSummaries);
  return <BindersListView binders={binders} onCreate={async (name) => {
    if (fail) throw new Error("Couldn’t create binder. Please try again.");
    setBinders((current) => [...current, { ...binderSummaries[0], _id: `viewer-${current.length}` as typeof binderSummaries[0]["_id"], name, itemCount: 0, songIds: [] }]);
  }} />;
}
export const Populated: Story = () => <ListExample />;
export const Empty: Story = () => <ListExample empty />;
export const CreationError: Story = () => <ListExample fail />;
export const Loading: Story = () => <BindersListView binders={undefined} loading />;
export const Unconfigured: Story = () => <BindersListView binders={[]} />;
const config = { meta: { previewLayout: "fullscreen" } };
export default config;
