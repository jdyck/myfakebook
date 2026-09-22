import { NextResponse } from "next/server";

import { abcToMusicXml } from "@/lib/abc";
import { DEFAULT_DISPLAY_SETTINGS, prepareAbcForExport, type ChartDisplaySettings } from "@/lib/abc-display";

function readDisplaySettings(value: unknown): ChartDisplaySettings {
  if (!value || typeof value !== "object") return DEFAULT_DISPLAY_SETTINGS;
  const candidate = value as Partial<ChartDisplaySettings>;
  return {
    showChords: typeof candidate.showChords === "boolean" ? candidate.showChords : true,
    showLyrics: typeof candidate.showLyrics === "boolean" ? candidate.showLyrics : true,
    transposition: typeof candidate.transposition === "number" && Number.isInteger(candidate.transposition)
      ? Math.max(-24, Math.min(24, candidate.transposition))
      : 0,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { abc?: unknown; display?: unknown };
    if (typeof body.abc !== "string") {
      return NextResponse.json({ error: "ABC source is required." }, { status: 400 });
    }
    if (body.abc.length > 200_000) {
      return NextResponse.json({ error: "ABC source is too large." }, { status: 413 });
    }

    const display = readDisplaySettings(body.display);
    const result = abcToMusicXml(prepareAbcForExport(body.abc, display));
    return new NextResponse(result.xml, {
      headers: {
        "Content-Type": "application/vnd.recordare.musicxml+xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "lead-sheet"}.musicxml"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not convert ABC source.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
