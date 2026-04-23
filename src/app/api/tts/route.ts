import { NextRequest, NextResponse } from "next/server";
import { mistral } from "@/lib/mistral";

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId } = await req.json();

    const response = await mistral.audio.speech.complete({
      model: "voxtral-mini-tts-2603",
      input: text,
      voiceId: voiceId,
      responseFormat: "mp3",
    });

    const audioBuffer = Buffer.from(response.audioData, "base64");

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("TTS API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate speech" },
      { status: 500 }
    );
  }
}
