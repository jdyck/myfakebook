"use client";

import { useRef, type ChangeEventHandler } from "react";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import componentStyles from "./sidebar-action.module.css";

type SidebarActionBase = {
  label: string;
  icon?: "plus" | "upload";
};

type SidebarActionProps =
  | (SidebarActionBase & {
      href: string;
      onClick?: never;
      onFileImport?: never;
    })
  | (SidebarActionBase & {
      href?: never;
      onClick: () => void;
      onFileImport?: never;
    })
  | (SidebarActionBase & {
      href?: never;
      onClick?: never;
      onFileImport: ChangeEventHandler<HTMLInputElement>;
    });

export function SidebarAction(props: SidebarActionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const content = (
    <>
      {props.icon === "plus" && <Plus aria-hidden="true" size={13} strokeWidth={2} />}
      {props.icon === "upload" && <Upload aria-hidden="true" size={13} strokeWidth={1.8} />}
      <span>{props.label}</span>
    </>
  );

  if (props.href) {
    return (
      <Link className={componentStyles.sidebarAction} href={props.href}>
        {content}
      </Link>
    );
  }

  if (props.onFileImport) {
    return (
      <>
        <button
          className={componentStyles.sidebarAction}
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          {content}
        </button>
        <input
          ref={fileInputRef}
          accept=".abc,.txt"
          hidden
          type="file"
          onChange={props.onFileImport}
        />
      </>
    );
  }

  return (
    <button className={componentStyles.sidebarAction} type="button" onClick={props.onClick}>
      {content}
    </button>
  );
}
