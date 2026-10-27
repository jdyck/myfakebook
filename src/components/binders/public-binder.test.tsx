import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
vi.mock("@/components/songs/preview/preview-panel", () => ({ PreviewPanel: ({ abc }: { abc: string }) => <div>{abc}</div> }));
import { PublicBinderView } from "./public-binder";
import type { Id } from "../../../convex/_generated/dataModel";
const binder = { _id: "binder" as Id<"binders">, name: "Holiday Songs", updatedAt: 0, items: [] };
test("empty regional views show an empty state with no editing controls", () => {
  const html = renderToStaticMarkup(<PublicBinderView binder={binder} />);
  expect(html).toContain("Holiday Songs");
  expect(html).toContain("No songs available in your location.");
  expect(html).not.toContain("Publish binder");
  expect(html).not.toContain("Settings");
  expect(html).not.toContain("Add songs");
});
test("public views show permitted song previews and direct song links", () => {
  const html = renderToStaticMarkup(<PublicBinderView binder={{ ...binder, items: [{ songId: "song" as Id<"songs">, title: "Holiday tune", abc: "K:C\nC|", displaySettings: undefined }] }} />);
  expect(html).toContain("Holiday tune");
  expect(html).toContain('href="/songs/song"');
  expect(html).toContain("K:C");
  expect(html).not.toContain("Remove song");
});
