import type { ComponentProps } from "react";
import { useState } from "react";
import styles from "./navigation.module.css";

type PreviewLinkProps = Omit<ComponentProps<"a">, "href"> & { href: string };

// Only the string href + anchor attributes used by these examples are supported.
export default function PreviewLink({ href, children, onClick, ...props }: PreviewLinkProps) {
  const [destination, setDestination] = useState("");
  return <>
    <a title={`Preview only: ${href} (navigation disabled)`} {...props} href="#" data-preview-href={href} onClick={(event) => {
      event.preventDefault();
      onClick?.(event);
      setDestination(href);
    }}>{children}</a>
    <span role="status" className={styles.status} hidden={!destination}>{destination && `Preview navigation: ${destination}. Navigation is disabled in Ladle.`}</span>
  </>;
}
