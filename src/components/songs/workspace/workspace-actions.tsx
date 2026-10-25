"use client";

import { Menu } from "@base-ui/react/menu";
import { useContext } from "react";
import { ChevronDown, Download, Maximize2, Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FullscreenPreviewContext } from "@/components/songs/preview/fullscreen-preview-context";
import componentStyles from "./workspace-actions.module.css";

type WorkspaceActionsProps = {
  exporting: boolean;
  onEdit: () => void;
  onExport: () => void;
  onExportAbc: () => void;
  onExportSvg: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
};

export function WorkspaceActions({ exporting, onEdit, onExport, onExportAbc, onExportSvg, onExportPng, onExportPdf }: WorkspaceActionsProps) {
  const fullscreenAction = useContext(FullscreenPreviewContext);

  return (
    <div className={componentStyles.workspaceActionGroup}>
      {fullscreenAction && (
        <Button
          aria-label="Open fullscreen preview"
          className={componentStyles.responsiveAction}
          disabled={fullscreenAction.disabled}
          size="compact"
          variant="secondary"
          title="Open fullscreen preview"
          type="button"
          onClick={(event) => fullscreenAction.onFullscreen(event.currentTarget)}
        >
          <Maximize2 aria-hidden="true" size={13} strokeWidth={1.8} />
          <span>Fullscreen</span>
        </Button>
      )}
      {fullscreenAction?.onZoom && <Button
        aria-label={fullscreenAction.zoomed ? "Fit score to width" : "Zoom score"}
        aria-pressed={fullscreenAction.zoomed}
        className={componentStyles.responsiveAction}
        disabled={fullscreenAction.disabled}
        size="compact"
        variant="secondary"
        title={fullscreenAction.zoomed ? "Fit the score to the available width" : "Enlarge the score for easier reading on narrow screens"}
        type="button"
        onClick={fullscreenAction.onZoom}
      >
        <Search size={14} strokeWidth={1.5} aria-hidden="true" />
        <span>{fullscreenAction.zoomed ? "Fit to width" : "Zoom score"}</span>
      </Button>}
      <Button
        aria-label="Edit song"
        data-action="edit"
        className={componentStyles.responsiveAction}
        size="compact"
        type="button"
        variant="secondary"
        onClick={onEdit}
      >
        <Pencil size={13} strokeWidth={1.8} aria-hidden="true" />
        <span>Edit song</span>
      </Button>
      <Menu.Root>
        <Menu.Trigger
          disabled={exporting}
          render={<Button className={componentStyles.responsiveAction} size="compact" variant="primary" />}
        >
          <Download size={13} strokeWidth={1.8} />
          Export
          <ChevronDown size={13} strokeWidth={2} />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="end" sideOffset={6}>
            <Menu.Popup className={componentStyles.exportMenuPopup}>
              <Menu.Item className={componentStyles.exportMenuItem} disabled={exporting} onClick={onExport}>
                MusicXML
              </Menu.Item>
              <Menu.Item className={componentStyles.exportMenuItem} disabled={exporting} onClick={onExportAbc}>
                ABC
              </Menu.Item>
              <Menu.Item className={componentStyles.exportMenuItem} disabled={exporting} onClick={onExportSvg}>
                SVG
              </Menu.Item>
              <Menu.Item className={componentStyles.exportMenuItem} disabled={exporting} onClick={onExportPng}>
                PNG
              </Menu.Item>
              <Menu.Item className={componentStyles.exportMenuItem} disabled={exporting} onClick={onExportPdf}>
                PDF
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
