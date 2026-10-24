import type { ComponentProps } from "react";

type PreviewImageProps = ComponentProps<"img"> & { fill?: boolean };

// Local string sources only: no Next image service, loaders or generated srcset.
export default function PreviewImage({ fill, style, alt, ...props }: PreviewImageProps) {
  // eslint-disable-next-line @next/next/no-img-element -- Ladle has no Next image optimizer.
  return <img {...props} alt={alt} style={fill ? {
    position: "absolute", inset: 0, width: "100%", height: "100%", ...style,
  } : style} />;
}
