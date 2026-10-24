import type { Story } from "@ladle/react";
import { useId, useState } from "react";
import { TextField } from "./text-field";

export const Editable: Story = () => {
  const id = useId();
  const [title, setTitle] = useState("The Session");
  const [query, setQuery] = useState("");
  return (
    <div className="flex flex-col gap-4">
      <label htmlFor={`${id}-title`}>Song title</label>
      <TextField id={`${id}-title`} size="large" value={title} onChange={(event) => setTitle(event.target.value)} />
      <label htmlFor={`${id}-search`}>Find a song</label>
      <TextField id={`${id}-search`} type="search" placeholder="Search your library" value={query} onChange={(event) => setQuery(event.target.value)} />
      <p role="status">{query ? `Searching for: ${query}` : `Title: ${title || "Untitled"}`}</p>
    </div>
  );
};
Editable.meta = { previewLayout: "sidebar" };

export const UnavailableAndLongContent: Story = () => (
  <div className="flex flex-col gap-4">
    <label>Unavailable title<TextField disabled value="Loading song…" /></label>
    <label>Read-only title<TextField readOnly value="The Last Tune of the Evening Before the Long Journey Home Across the Mountains" /></label>
  </div>
);
UnavailableAndLongContent.meta = { previewLayout: "sidebar" };
