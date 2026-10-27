"use client";

import { Select } from "@/components/ui/select";
import { publicationLabel, type PublicationValue } from "@/lib/songs/types";

export function PublicationSelect({ publication, changing = false, onChange }: {
  publication: PublicationValue;
  changing?: boolean;
  onChange: (value: PublicationValue) => void;
}) {
  return <Select
    ariaLabel={`Public domain: ${publicationLabel(publication)}`}
    disabled={changing}
    onValueChange={(value) => {
      if (value === "none" || value === "US" || value === "worldwide") onChange(value);
    }}
    options={(["none", "US", "worldwide"] as const).map((value) => ({ value, label: publicationLabel(value) }))}
    trigger={<>Public domain: {publicationLabel(publication)}</>}
    value={publication}
  />;
}
