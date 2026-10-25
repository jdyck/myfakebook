// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";
import { resolveSongSource } from "@/lib/songs/song-source";
import { SongEditorDrawer } from "./song-editor-drawer";

vi.mock("@/components/songs/preview/abc-preview", () => ({
  AbcPreview: ({ abc }: { abc: string }) => <pre>{abc}</pre>,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

test("locks background scrolling while open and restores it on close or unmount", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const originalRootOverflow = document.documentElement.style.overflow;
  const originalBodyOverflow = document.body.style.overflow;
  const source = resolveSongSource({ title: "Song", abc: "X:1\nT:Song\nM:4/4\nK:C\nC8|" });
  const renderDrawer = (isOpen: boolean) => <SongEditorDrawer
    {...source} title="Song" isOpen={isOpen} copied={false} feedback={null} lineCount={5}
    onTitleChange={() => {}} onClose={() => {}} onCopy={() => {}} onFormat={() => {}}
    onContentChange={() => {}} onChange={() => {}}
  />;
  try {
    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "scroll";
    await act(async () => root.render(renderDrawer(false)));
    const dialog = host.querySelector("dialog")!;
    dialog.showModal = () => dialog.setAttribute("open", "");
    dialog.close = () => dialog.removeAttribute("open");
    await act(async () => root.render(renderDrawer(true)));
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.body.style.overflow).toBe("hidden");
    await act(async () => root.render(renderDrawer(false)));
    expect(document.documentElement.style.overflow).toBe("auto");
    expect(document.body.style.overflow).toBe("scroll");
    await act(async () => root.render(renderDrawer(true)));
    await act(async () => root.render(null));
    expect(document.documentElement.style.overflow).toBe("auto");
    expect(document.body.style.overflow).toBe("scroll");
  } finally {
    await act(async () => root.unmount());
    host.remove();
    document.documentElement.style.overflow = originalRootOverflow;
    document.body.style.overflow = originalBodyOverflow;
  }
});

test("the title field and both ABC titles stay synchronized, including clearing it", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  function Harness() {
    const [title, setTitle] = useState("Original");
    const [source, setSource] = useState(() => resolveSongSource({ title, abc: "X:1\nT:Original\nM:4/4\nL:1/8\nK:C\nC8|" }));
    return <SongEditorDrawer
      {...source} title={title} isOpen={false} copied={false} feedback={null} lineCount={7}
      onTitleChange={setTitle} onClose={() => {}} onCopy={() => {}} onFormat={() => {}} onContentChange={() => {}}
      onChange={(abc, abcParts) => setSource(resolveSongSource({ title, abc, abcParts }))}
    />;
  }
  async function editTitle(value: string) {
    const textarea = host.querySelector("textarea")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(textarea, textarea.value.replace(/^T:.*$/m, `T:${value}`));
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  try {
    await act(async () => root.render(<Harness />));
    await editTitle("Inline title");
    expect(host.querySelector("input")!.value).toBe("Inline title");
    await act(async () => Array.from(host.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find((tab) => tab.textContent === "Separate parts")!.click());
    expect(host.querySelector("textarea")!.value).toContain("T:Inline title");
    await editTitle("Parts title");
    expect(host.querySelector("input")!.value).toBe("Parts title");
    await editTitle("");
    expect(host.querySelector("input")!.value).toBe("");
    await act(async () => Array.from(host.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find((tab) => tab.textContent === "Inline chords")!.click());
    expect(host.querySelector("textarea")!.value).toMatch(/^T:$/m);
    const addSubtitle = host.querySelector<HTMLButtonElement>('[aria-label="Add Subtitle"]')!;
    expect(addSubtitle.title).toBe("Add Subtitle");
    await act(async () => addSubtitle.click());
    expect(addSubtitle.disabled).toBe(true);
    const subtitleInput = host.querySelector<HTMLInputElement>("#song-editor-subtitle-input")!;
    expect(subtitleInput).not.toBeNull();
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(subtitleInput, "A second title");
      subtitleInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(host.querySelector("textarea")!.value).toContain("T:A second title");
    await act(async () => Array.from(host.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find((tab) => tab.textContent === "Separate parts")!.click());
    expect(host.querySelector("textarea")!.value).toContain("T:A second title");
    await act(async () => {
      const textarea = host.querySelector("textarea")!;
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(textarea, textarea.value.replace("T:A second title", "T:From parts"));
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(subtitleInput.value).toBe("From parts");
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Remove subtitle"]')!.click());
    expect(host.querySelector("#song-editor-subtitle-input")).toBeNull();
    expect(addSubtitle.disabled).toBe(false);
    expect(host.querySelector("textarea")!.value).not.toContain("T:From parts");
    await act(async () => Array.from(host.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find((tab) => tab.textContent === "Inline chords")!.click());
    async function editTitleField(value: string) {
      const input = host.querySelector("input")!;
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }
    await editTitleField("New $& title");
    expect(host.querySelector("textarea")!.value).toContain("T:New $& title");
    await act(async () => Array.from(host.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find((tab) => tab.textContent === "Separate parts")!.click());
    expect(host.querySelector("textarea")!.value).toContain("T:New $& title");
    // A valid parts draft must also refresh after editing the title field.
    await editTitle("Parts draft title");
    await editTitleField("From the field");
    expect(host.querySelector("textarea")!.value).toContain("T:From the field");
    await editTitleField("");
    expect(host.querySelector("textarea")!.value).toMatch(/^T:$/m);
    await act(async () => Array.from(host.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find((tab) => tab.textContent === "Inline chords")!.click());
    expect(host.querySelector("textarea")!.value).toMatch(/^T:$/m);
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});
