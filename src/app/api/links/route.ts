import { NextRequest, NextResponse } from "next/server";
import { LinkService } from "@/lib/services/links";

export async function POST(request: NextRequest) {
  try {
    const { sourceType, sourceId, targetType, targetId, relationshipType } = await request.json();

    const link = await LinkService.link(
      sourceType,
      sourceId,
      targetType,
      targetId,
      relationshipType || "linked"
    );

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error("Link create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create link" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceType = searchParams.get("sourceType");
    const sourceId = searchParams.get("sourceId");
    const targetType = searchParams.get("targetType");
    const targetId = searchParams.get("targetId");

    if (sourceType && sourceId) {
      const links = await LinkService.getLinksFor(sourceType as any, sourceId);
      return NextResponse.json(links);
    }

    if (targetType && targetId) {
      const links = await LinkService.getLinksTo(targetType as any, targetId);
      return NextResponse.json(links);
    }

    return NextResponse.json({ error: "Missing query parameters" }, { status: 400 });
  } catch (error) {
    console.error("Link query error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to query links" },
      { status: 500 }
    );
  }
}
