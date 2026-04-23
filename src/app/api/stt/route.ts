import { NextRequest, NextResponse } from "next/server";
import { mistral } from "@/lib/mistral";

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

    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const response = await mistral.audio.transcriptions.complete({
      model: "voxtral-mini-latest",
      file: new Blob([buffer], { type: "audio/webm" }),
    });

    return NextResponse.json({ text: response.text });
  } catch (error: any) {
    console.error("STT API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}
