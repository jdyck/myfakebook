type SongFileExtension = "abc" | "musicxml" | "pdf" | "png" | "svg";

export function downloadSongFile(
  blob: Blob,
  title: string,
  extension: SongFileExtension,
  revokeDelayMs = 0,
) {
  const normalizedTitle = title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  const filename = `${normalizedTitle || "lead-sheet"}.${extension}`;
  const downloadUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = filename;

  try {
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    if (revokeDelayMs > 0) {
      window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), revokeDelayMs);
    } else {
      window.URL.revokeObjectURL(downloadUrl);
    }
  }
}
