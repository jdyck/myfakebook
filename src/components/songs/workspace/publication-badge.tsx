import { publicationLabel, type PublicationValue } from "@/lib/songs/types";
import componentStyles from "./publication-badge.module.css";

type PublishedTerritory = Exclude<PublicationValue, "none">;

export function PublicationBadge({ territory }: { territory: PublishedTerritory }) {
  return <span className={componentStyles.publicationBadge}>Published: {publicationLabel(territory)}</span>;
}
