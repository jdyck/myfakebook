import type { ComponentPropsWithRef } from "react";
import styles from "./button.module.css";

type ButtonVariant = "primary" | "secondary" | "quiet" | "danger" | "field";
type ButtonSize = "compact" | "regular" | "icon";

type ButtonProps = Omit<ComponentPropsWithRef<"button">, "className"> & {
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export function Button({
  className,
  size = "compact",
  variant = "secondary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={[styles.button, styles[size], styles[variant], className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
