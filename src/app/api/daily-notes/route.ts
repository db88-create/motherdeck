import { NextRequest, NextResponse } from "next/server";
import { DailyNoteService } from "@/lib/services/daily-notes";

export async function GET() {
  try {
    // Always return the single persistent note
    const note = await DailyNoteService.getOrCreatePersistent();
    return NextResponse.json(note);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "Note ID required" }, { status: 400 });
    }
    const note = await DailyNoteService.update(body.id, body.content ?? "");
    return NextResponse.json(note);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
