import type { ComponentPropsWithRef } from "react";
import styles from "./text-field.module.css";

export type TextFieldSize = "compact" | "large";

type TextFieldProps = Omit<ComponentPropsWithRef<"input">, "className" | "size"> & {
  className?: string;
  size?: TextFieldSize;
};

export function TextField({ className, size = "compact", ...props }: TextFieldProps) {
  return (
    <input
      className={[styles.textField, styles[size], className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
