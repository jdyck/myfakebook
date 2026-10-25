import type { Story } from "@ladle/react";
import { useState } from "react";
import { PublicationSelect } from "./publication-select";
import { publicationLabel, type PublicationValue } from "@/lib/songs/types";

function PublicationExample({ initial = "none", changing = false, fail = false }: { initial?: PublicationValue; changing?: boolean; fail?: boolean }) {
  const [publication, setPublication] = useState(initial);
  const [status, setStatus] = useState("");
  return <div>
    <PublicationSelect publication={publication} changing={changing} onChange={(value) => {
      if (fail) { setStatus("Couldn’t update publication"); return; }
      setPublication(value);
      setStatus(value === "none" ? "Song is private" : `Published ${publicationLabel(value)}`);
    }} />
    <p role="status" className="mt-4 text-xs text-muted">{status}</p>
  </div>;
}
export const Private: Story = () => <PublicationExample />;
export const UnitedStates: Story = () => <PublicationExample initial="US" />;
export const Worldwide: Story = () => <PublicationExample initial="worldwide" />;
export const Saving: Story = () => <PublicationExample initial="US" changing />;
export const UpdateError: Story = () => <PublicationExample fail />;
