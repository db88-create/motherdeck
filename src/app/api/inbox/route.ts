import { NextRequest, NextResponse } from "next/server";
import { InboxService } from "@/lib/services/inbox";

export async function GET(req: NextRequest) {
  try {
    const processed = req.nextUrl.searchParams.get("processed");
    const items = await InboxService.list(
      processed !== null ? processed === "true" : undefined
    );
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.content?.trim()) {
      return NextResponse.json({ error: "Content required" }, { status: 400 });
    }
    const item = await InboxService.create(
      body.content.trim(),
      body.sourceType || "text",
      body.dueDate || undefined
    );
    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    const { id, ...updates } = body;
    await InboxService.update(id, updates);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    await InboxService.remove(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
