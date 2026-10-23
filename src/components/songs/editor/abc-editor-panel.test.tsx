// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { AbcEditorPanel } from "./abc-editor-panel";
import { resolveSongSource } from "@/lib/songs/song-source";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const initial = 'X:1\nT:Song\nM:3/4\nL:1/4\nK:F\nP:A\n"F"d2 "C7"A |\nw:Toy- land!';
let root: Root;
let container: HTMLDivElement;
const onCopy = vi.fn();

async function renderEditor() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  function Harness() {
    const [source, setSource] = useState(() => resolveSongSource({ title: "Song", abc: initial }));
    return <>
      <AbcEditorPanel
        {...source}
        lineCount={source.abc.split("\n").length}
        copied={false}
        onCopy={onCopy}
        onFormat={() => {}}
        onChange={(abc, abcParts) => setSource((previous) => resolveSongSource({ title: "Song", abc, abcParts }, previous.abc))}
        onContentChange={(content) => setSource((previous) => resolveSongSource({ title: "Song", content }, previous.abc))}
      />
      <pre data-preview>{source.abc}</pre>
      <pre data-content>{JSON.stringify(source.content)}</pre>
    </>;
  }
  await act(async () => root.render(<Harness />));
}

async function selectTab(name: string) {
  await act(async () => {
    Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find((tab) => tab.textContent === name)!.click();
  });
}

async function typeSource(value: string) {
  const textarea = container.querySelector("textarea")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(textarea, value);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function preview() { return container.querySelector("[data-preview]")!.textContent!; }
function source() { return container.querySelector("textarea")!.value; }

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  container?.remove();
  onCopy.mockReset();
});

test("the ABC and JSON tabs edit the same object and inline preview", async () => {
  await renderEditor();
  expect(container.querySelectorAll('[role="tab"]')).toHaveLength(4);
  await selectTab("Separate parts");
  expect(source()).toContain("V:chords");
  expect(source()).toContain("V:melody");
  await typeSource(source().replace('"F"x2', '"Bb"x2'));
  expect(preview()).toContain('"Bb"d2');
  await selectTab("JSON");
  const content = JSON.parse(source());
  expect(content.measures[0].chords[0]).toEqual(["Bb", 2]);
  content.measures[0].chords[0][0] = "Gm";
  await typeSource(JSON.stringify(content));
  expect(preview()).toContain('"Gm"d2');
  expect(preview()).toContain("P:A");
  expect(JSON.parse(container.querySelector("[data-content]")!.textContent!)).toEqual(content);
  await selectTab("Inline chords");
  expect(source()).toBe(preview());
  await typeSource(source().replace('"Gm"', '"Dm"'));
  await selectTab("JSON");
  expect(JSON.parse(source()).measures[0].chords[0]).toEqual(["Dm", 2]);
});

test("incomplete JSON and invalid part timing retain the last valid song", async () => {
  await renderEditor();
  const before = preview();
  await selectTab("JSON");
  await typeSource("{");
  expect(source()).toBe("{");
  expect(container.querySelector('[role="alert"]')).not.toBeNull();
  expect(preview()).toBe(before);
  await selectTab("Separate parts");
  const validParts = source();
  await typeSource(validParts.replace('"F"x2', '"F"x4'));
  expect(container.querySelector('[role="alert"]')!.textContent).toContain("same total duration");
  expect(preview()).toBe(before);
  await typeSource(validParts.replace('"F"x2', '"Am"x2'));
  expect(preview()).toContain('"Am"d2');
  expect(container.querySelector('[role="alert"]')).toBeNull();
});

test("Copy uses the selected representation and tabs support keyboard navigation", async () => {
  await renderEditor();
  const firstTab = container.querySelector<HTMLButtonElement>('[role="tab"]')!;
  await act(async () => firstTab.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true })));
  expect(document.activeElement?.textContent).toBe("JSON");
  expect(container.querySelector('[role="tab"][aria-selected="true"]')!.textContent).toBe("JSON");
  const json = source();
  await act(async () => {
    Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((button) => button.textContent === "Copy")!.click();
  });
  expect(onCopy).toHaveBeenCalledWith(json);
});

test("the restored Easy editor stays synchronized with JSON and the preview", async () => {
  await renderEditor();
  await selectTab("Easy");
  expect(container.querySelector('[role="tab"][aria-selected="true"]')!.textContent).toBe("Easy");
  expect(container.querySelector('#abc-easy-panel textarea')?.getAttribute("aria-label")).toBe("Easy chord, melody, and lyric editor");
  await typeSource(source().replace("F", "G"));
  expect(preview()).toContain('"G"');
  await selectTab("JSON");
  const content = JSON.parse(source());
  expect(content.measures[0].chords[0]).toEqual(["G", 2]);
  content.measures[0].chords[0][0] = "Dm";
  await typeSource(JSON.stringify(content));
  await selectTab("Easy");
  expect(source()).toContain("Dm");
  expect(preview()).toContain('"Dm"');
});
