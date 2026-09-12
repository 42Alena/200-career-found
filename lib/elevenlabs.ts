import { env } from "@/lib/env";

const speechToTextEndpoint = "https://api.elevenlabs.io/v1/speech-to-text";

export async function transcribeAudio(input: {
  audio: Blob;
  filename: string;
}): Promise<{ text: string } | null> {
  if (!env.ELEVENLABS_API_KEY) {
    return null;
  }

  try {
    const form = new FormData();
    form.append("file", input.audio, input.filename);
    form.append("model_id", "scribe_v1");

    const response = await fetch(speechToTextEndpoint, {
      method: "POST",
      headers: {
        "xi-api-key": env.ELEVENLABS_API_KEY,
      },
      body: form,
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as { text?: string };
    return typeof body.text === "string" ? { text: body.text } : null;
  } catch {
    return null;
  }
}
