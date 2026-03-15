import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      // Fallback: simple local parsing without Claude
      return NextResponse.json(parseLocally(text));
    }

    // Call Claude API to extract structured task data
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Parse this task description into structured data. Extract the main task title, any subtasks mentioned, priority level, and due date if mentioned.

Task description: "${text}"

Respond with ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "title": "Main task title (concise, action-oriented)",
  "subtasks": ["subtask 1", "subtask 2"],
  "priority": "low" or "medium" or "high" or "urgent",
  "dueDate": "YYYY-MM-DD" or null,
  "description": "Any additional context or details",
  "project": "Project name if mentioned" or ""
}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error(
        "[parse-task] Claude API error:",
        response.status,
        await response.text()
      );
      // Fallback to local parsing
      return NextResponse.json(parseLocally(text));
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "";

    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          title: parsed.title || text.slice(0, 100),
          subtasks: Array.isArray(parsed.subtasks) ? parsed.subtasks : [],
          priority: ["low", "medium", "high", "urgent"].includes(
            parsed.priority
          )
            ? parsed.priority
            : "medium",
          dueDate: parsed.dueDate || null,
          description: parsed.description || "",
          project: parsed.project || "",
          source: "claude",
        });
      }
    } catch (parseErr) {
      console.error("[parse-task] JSON parse error:", parseErr);
    }

    // Fallback
    return NextResponse.json(parseLocally(text));
  } catch (error: any) {
    console.error("[parse-task] Error:", error.message);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Simple local parsing without Claude API.
 * Extracts basic structure from natural language.
 */
function parseLocally(text: string) {
  const lines = text
    .split(/[.!?\n]/)
    .map((l) => l.trim())
    .filter(Boolean);
  const title = lines[0]?.slice(0, 120) || text.slice(0, 120);
  const subtasks = lines.slice(1).filter((l) => l.length > 5 && l.length < 200);

  // Priority detection
  let priority = "medium";
  const lower = text.toLowerCase();
  if (
    lower.includes("urgent") ||
    lower.includes("asap") ||
    lower.includes("critical")
  ) {
    priority = "urgent";
  } else if (
    lower.includes("important") ||
    lower.includes("high priority")
  ) {
    priority = "high";
  } else if (lower.includes("low priority") || lower.includes("when possible")) {
    priority = "low";
  }

  // Date detection (simple patterns)
  let dueDate: string | null = null;
  const dateMatch = text.match(
    /(?:by|due|before|on)\s+(\d{4}-\d{2}-\d{2}|\w+ \d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)/i
  );
  if (dateMatch) {
    try {
      const d = new Date(dateMatch[1]);
      if (!isNaN(d.getTime())) {
        dueDate = d.toISOString().split("T")[0];
      }
    } catch {}
  }

  // Tomorrow / today / next week
  const now = new Date();
  if (lower.includes("tomorrow")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    dueDate = d.toISOString().split("T")[0];
  } else if (lower.includes("today")) {
    dueDate = now.toISOString().split("T")[0];
  } else if (lower.includes("next week")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    dueDate = d.toISOString().split("T")[0];
  }

  return {
    title,
    subtasks: subtasks.slice(0, 5),
    priority,
    dueDate,
    description: text.length > 120 ? text : "",
    project: "",
    source: "local",
  };
}
