"use client";

import { useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";
import { abcSubtitle, updateAbcTitle } from "@/lib/notation/abc-titles";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import type { SongContent } from "@/lib/songs/song-content";
import { AbcEditorPanel } from "@/components/songs/editor/abc-editor-panel";
import { EditorPreview } from "./editor-preview";
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
  const subtitle = abcSubtitle(abc);
  const subtitleRef = useRef<HTMLInputElement>(null);
  const focusSubtitle = useRef(false);

  useEffect(() => {
    if (focusSubtitle.current && subtitle !== undefined) {
      subtitleRef.current?.focus();
      focusSubtitle.current = false;
    }
  }, [subtitle]);

  function changeTitle(index: 0 | 1, value: string | null) {
    if (index === 0) onTitleChange(value ?? "");
    onChange(updateAbcTitle(abc, index, value), abcParts ? updateAbcTitle(abcParts, index, value) : undefined);
  }

  useEffect(() => {
    if (!isOpen) return;

    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    root.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, [isOpen]);

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
      <div className={componentStyles.drawerPanels}>
        <section aria-label="Live song preview" className={componentStyles.drawerPreview}>
          {isOpen && <EditorPreview abc={abc} />}
        </section>
      <div className={componentStyles.drawerBody}>
        <div className="flex items-end gap-2">
        <label className={`${componentStyles.titleField} min-w-0 flex-1`} htmlFor="song-editor-title-input">
          Song title
          <TextField
            autoComplete="off"
            id="song-editor-title-input"
            size="large"
            value={title}
            onChange={(event) => changeTitle(0, event.target.value)}
          />
        </label>
        <Button variant="field" size="icon" aria-label="Add Subtitle" title="Add Subtitle" disabled={subtitle !== undefined}
          onClick={() => { focusSubtitle.current = true; changeTitle(1, ""); }}>
          <Plus aria-hidden="true" size={18} />
        </Button>
        </div>
        {subtitle !== undefined && (
          <div className="flex items-end gap-2">
            <label className={`${componentStyles.titleField} min-w-0 flex-1`} htmlFor="song-editor-subtitle-input">
              Subtitle
              <TextField autoComplete="off" id="song-editor-subtitle-input" ref={subtitleRef} size="large"
                value={subtitle} onChange={(event) => changeTitle(1, event.target.value)} />
            </label>
            <Button variant="field" size="icon" aria-label="Remove subtitle" title="Remove subtitle"
              onClick={() => { changeTitle(1, null); dialogRef.current?.querySelector<HTMLInputElement>("#song-editor-title-input")?.focus(); }}>
              <X aria-hidden="true" size={18} />
            </Button>
          </div>
        )}
        {feedback && <p className={componentStyles.feedbackStatus} role="status">{feedback}</p>}
        <div className={componentStyles.drawerEditor}>
          <AbcEditorPanel
            abc={abc}
            abcParts={abcParts}
            content={content}
            onContentChange={onContentChange}
            copied={copied}
            lineCount={lineCount}
            onChange={(value, parts) => {
              const abcTitle = value.match(/^T:[\t ]*([^\r\n]*)/m)?.[1]?.trim();
              if (abcTitle !== undefined && abcTitle !== title) onTitleChange(abcTitle);
              onChange(value, parts);
            }}
            onCopy={onCopy}
            onFormat={onFormat}
          />
        </div>
      </div>
      </div>
    </dialog>
  );
}
