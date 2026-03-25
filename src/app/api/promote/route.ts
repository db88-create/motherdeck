import { NextRequest, NextResponse } from "next/server";
import { PromoteService } from "@/lib/services/promote";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceType, sourceId, targetType, options } = body;

    // Route to appropriate promotion method
    let resultId: string;

    if (sourceType === "inbox") {
      switch (targetType) {
        case "task":
          resultId = await PromoteService.inboxToTask(sourceId, options);
          break;
        case "note":
          await PromoteService.inboxToNote(sourceId);
          resultId = sourceId;
          break;
        case "focus":
          resultId = await PromoteService.inboxToFocus(sourceId, options);
          break;
        case "idea":
          resultId = await PromoteService.inboxToIdea(sourceId);
          break;
        default:
          return NextResponse.json({ error: "Unknown target type" }, { status: 400 });
      }
    } else if (sourceType === "note-selection") {
      switch (targetType) {
        case "task":
          resultId = await PromoteService.noteSelectionToTask(sourceId, options);
          break;
        case "focus":
          resultId = await PromoteService.noteSelectionToFocus(sourceId, options);
          break;
        default:
          return NextResponse.json({ error: "Unknown target type" }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Unknown source type" }, { status: 400 });
    }

    return NextResponse.json({ success: true, resultId }, { status: 200 });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Promote error:", errMsg);
    return NextResponse.json(
      { error: `Promotion failed: ${errMsg}` },
      { status: 500 }
    );
  }
}
