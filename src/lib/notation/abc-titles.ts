function headerLines(abc: string) {
  const lines = abc.split("\n");
  const key = lines.findIndex((line) => /^K:/.test(line));
  const titles = lines.flatMap((line, index) => /^T:/.test(line) && (key < 0 || index < key) ? [index] : []);
  return { lines, titles };
}

export function abcSubtitle(abc: string): string | undefined {
  const { lines, titles } = headerLines(abc);
  return titles[1] === undefined ? undefined : lines[titles[1]].slice(2).replace(/\r$/, "");
}

/** Update one header title while preserving other titles and body section names. */
export function updateAbcTitle(abc: string, index: 0 | 1, value: string | null): string {
  const { lines, titles } = headerLines(abc);
  const existing = titles[index];
  if (existing !== undefined) {
    lines.splice(existing, 1, ...(value === null ? [] : [`T:${value}`]));
  } else if (value !== null) {
    const reference = lines.findIndex((line) => /^X:/.test(line));
    lines.splice(index === 1 && titles[0] !== undefined ? titles[0] + 1 : reference + 1, 0, `T:${value}`);
  }
  return lines.join("\n");
}
