import { NextResponse } from "next/server";

import { abcToMusicXml } from "@/lib/abc";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { abc?: unknown };
    if (typeof body.abc !== "string") {
      return NextResponse.json({ error: "ABC source is required." }, { status: 400 });
    }
    if (body.abc.length > 200_000) {
      return NextResponse.json({ error: "ABC source is too large." }, { status: 413 });
    }

    const result = abcToMusicXml(body.abc);
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
