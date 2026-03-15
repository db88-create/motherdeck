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
      return NextResponse.json(classifyLocally(text));
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 150,
        messages: [
          {
            role: "user",
            content: `Classify this note. Should it become a task (actionable item with clear next step), an idea (interesting thought to explore later), or stay as a note (context, observation, or reference)?

Note: "${text}"

Respond with ONLY valid JSON: { "action": "task" | "idea" | "keep", "reason": "one sentence why", "confidence": 0.0 to 1.0 }`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json(classifyLocally(text));
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "";

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          action: ["task", "idea", "keep"].includes(parsed.action)
            ? parsed.action
            : "keep",
          reason: parsed.reason || "",
          confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
          source: "claude",
        });
      }
    } catch {}

    return NextResponse.json(classifyLocally(text));
  } catch (error: any) {
    console.error("[suggest-action] Error:", error.message);
    return NextResponse.json(classifyLocally(req.body ? "" : ""));
  }
}

function classifyLocally(text: string) {
  const lower = text.toLowerCase();

  // Task signals
  const taskSignals = [
    "need to",
    "should",
    "must",
    "have to",
    "fix",
    "deploy",
    "send",
    "call",
    "email",
    "follow up",
    "update",
    "create",
    "build",
    "review",
    "check",
    "schedule",
    "set up",
    "configure",
    "install",
    "implement",
    "add",
    "remove",
    "delete",
    "migrate",
    "test",
    "debug",
    "push",
    "merge",
    "release",
    "ship",
  ];

  // Idea signals
  const ideaSignals = [
    "what if",
    "maybe",
    "could",
    "might",
    "idea:",
    "thought:",
    "explore",
    "consider",
    "wonder",
    "imagine",
    "possible",
    "potential",
    "experiment",
    "try",
    "brainstorm",
    "interesting",
  ];

  const taskScore = taskSignals.filter((s) => lower.includes(s)).length;
  const ideaScore = ideaSignals.filter((s) => lower.includes(s)).length;

  if (taskScore > ideaScore && taskScore > 0) {
    return {
      action: "task" as const,
      reason: "Contains actionable language",
      confidence: Math.min(0.8, 0.4 + taskScore * 0.1),
      source: "local",
    };
  }
  if (ideaScore > 0) {
    return {
      action: "idea" as const,
      reason: "Contains exploratory language",
      confidence: Math.min(0.7, 0.3 + ideaScore * 0.1),
      source: "local",
    };
  }

  return {
    action: "keep" as const,
    reason: "General note or observation",
    confidence: 0.5,
    source: "local",
  };
}
