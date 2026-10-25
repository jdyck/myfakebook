import type { Story } from "@ladle/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { resolveSongSource, type SongSourceInput } from "@/lib/songs/song-source";
import { SongEditorDrawer } from "./song-editor-drawer";
import { songEditorDrawerFixtures } from "./song-editor-drawer.fixtures";

function DrawerExample({ initialSong }: { initialSong: SongSourceInput }) {
  const [isOpen, setIsOpen] = useState(true);
  const [title, setTitle] = useState(initialSong.title);
  const [source, setSource] = useState(() => resolveSongSource(initialSong));
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  function changeAbc(abc: string, abcParts?: string) {
    setCopied(false);
    try {
      setSource(resolveSongSource({ title, abc, abcParts }, source.abc));
      setFeedback(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Check the song format.");
    }
  }

  return (
    <div className="p-6">
      <Button onClick={() => setIsOpen(true)}>Edit song</Button>
      <SongEditorDrawer
        {...source}
        title={title}
        isOpen={isOpen}
        copied={copied}
        feedback={feedback}
        lineCount={source.abc.split("\n").length}
        onClose={() => setIsOpen(false)}
        onTitleChange={setTitle}
        onChange={changeAbc}
        onContentChange={(content) => {
          setSource(resolveSongSource({ title, content }, source.abc));
          setCopied(false);
          setFeedback(null);
        }}
        onFormat={() => {
          changeAbc(source.abc.replaceAll("\r\n", "\n").split("\n").map((line) => line.trimEnd()).join("\n").replace(/\n{3,}/g, "\n\n"));
          setFeedback("ABC spacing cleaned up");
        }}
        onCopy={async (value) => {
          try {
            await navigator.clipboard.writeText(value ?? source.abc);
            setCopied(true);
            setFeedback("Copied to clipboard");
          } catch {
            setFeedback("Clipboard unavailable in this viewer.");
          }
        }}
      />
    </div>
  );
}

export const Populated: Story = () => <DrawerExample initialSong={songEditorDrawerFixtures.populated} />;
Populated.meta = { previewLayout: "fullscreen" };

export const Empty: Story = () => <DrawerExample initialSong={songEditorDrawerFixtures.empty} />;
Empty.meta = { previewLayout: "fullscreen" };

export const WithSubtitle: Story = () => <DrawerExample initialSong={songEditorDrawerFixtures.withSubtitle} />;
WithSubtitle.meta = { previewLayout: "fullscreen" };
