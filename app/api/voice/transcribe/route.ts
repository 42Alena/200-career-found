import { badRequest } from "@/lib/api";
import { env } from "@/lib/env";
import { transcribeAudio } from "@/lib/elevenlabs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!env.ELEVENLABS_API_KEY) {
    return Response.json(
      { error: "Voice transcription is not configured" },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return badRequest("Request body must be multipart/form-data");
  }

  const file = formData.get("audio");

  if (!(file instanceof Blob) || file.size === 0) {
    return badRequest("audio file is required");
  }

  if (file.size > 25 * 1024 * 1024) {
    return badRequest("audio file is too large");
  }

  const result = await transcribeAudio({
    audio: file,
    filename: "recording.webm",
  });

  if (!result) {
    return Response.json({ error: "Transcription failed" }, { status: 502 });
  }

  return Response.json({ text: result.text });
}
