function titleSortKey(title: string): string {
  return title.trim()
    .replace(/^[\p{P}\s]+/u, "")
    .replace(/^(?:a|the)\s+/i, "")
    .replace(/^[\p{P}\s]+/u, "");
}

export function compareSongTitles(a: string, b: string): number {
  return titleSortKey(a).localeCompare(titleSortKey(b));
}
