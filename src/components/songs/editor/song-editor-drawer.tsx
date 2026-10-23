"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { TextField } from "@/components/ui/text-field";
import type { SongContent } from "@/lib/song-content";
import { AbcEditorPanel } from "@/components/songs/editor/abc-editor-panel";
import componentStyles from "./song-editor-drawer.module.css";

type SongEditorDrawerProps = {
  abc: string;
  abcParts: string;
  content: SongContent;
  onContentChange: (content: SongContent) => void;
  copied: boolean;
  feedback: string | null;
  isOpen: boolean;
  lineCount: number;
  title: string;
  onChange: (value: string, abcParts?: string) => void;
  onClose: () => void;
  onCopy: (value?: string) => void;
  onFormat: () => void;
  onTitleChange: (value: string) => void;
};

export function SongEditorDrawer({
  abc,
  abcParts,
  content,
  onContentChange,
  copied,
  feedback,
  isOpen,
  lineCount,
  title,
  onChange,
  onClose,
  onCopy,
  onFormat,
  onTitleChange,
}: SongEditorDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      aria-labelledby="song-editor-title"
      className={componentStyles.editorDrawer}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <header className={componentStyles.drawerHeader}>
        <div>
          <p className={componentStyles.drawerEyebrow}>Edit mode</p>
          <h2 className={componentStyles.drawerTitle} id="song-editor-title">Edit song</h2>
        </div>
        <button
          aria-label="Close edit mode"
          className={componentStyles.closeButton}
          type="button"
          onClick={() => dialogRef.current?.close()}
        >
          <X aria-hidden="true" size={20} strokeWidth={1.8} />
        </button>
      </header>
      <div className={componentStyles.drawerBody}>
        <label className={componentStyles.titleField} htmlFor="song-editor-title-input">
          Song title
          <TextField
            autoComplete="off"
            id="song-editor-title-input"
            size="large"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
          />
        </label>
        {feedback && <p className={componentStyles.feedbackStatus} role="status">{feedback}</p>}
        <div className={componentStyles.drawerEditor}>
          <AbcEditorPanel
            abc={abc}
            abcParts={abcParts}
            content={content}
            onContentChange={onContentChange}
            copied={copied}
            lineCount={lineCount}
            onChange={onChange}
            onCopy={onCopy}
            onFormat={onFormat}
          />
        </div>
      </div>
    </dialog>
  );
}
