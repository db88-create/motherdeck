import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await audioFile.arrayBuffer());

    // Send to Anthropic Whisper API
    // Anthropic uses the Files API for multimodal support including audio
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-1-20250805",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please transcribe this audio. Respond with ONLY the transcribed text, no explanations.",
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "audio/webm",
                  data: buffer.toString("base64"),
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(
        "[speech-to-text] Anthropic API error:",
        response.status,
        errorData
      );
      return NextResponse.json(
        { error: "Failed to transcribe audio" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const transcription = data.content?.[0]?.text || "";

    if (!transcription) {
      return NextResponse.json(
        { error: "No transcription returned" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      transcription: transcription.trim(),
      duration: audioFile.size,
    });
  } catch (error: any) {
    console.error("[speech-to-text] Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to process audio" },
      { status: 500 }
    );
  }
}
