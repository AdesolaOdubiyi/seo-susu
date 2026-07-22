import Groq from "groq-sdk";
import { ApiError } from "@/lib/db/types";

const DEFAULT_MODEL = "llama-3.1-8b-instant";

/** True when a Groq API key is available (lets callers pick a fallback). */
export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

export function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new ApiError(
      "GROQ_API_KEY is not set. Add it to .env.local before using /api/chat.",
      503,
    );
  }
  return new Groq({ apiKey });
}

export function getGroqModel(): string {
  return process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;
}

export async function completeChat(input: {
  systemPrompt: string;
  userMessage: string;
}): Promise<string> {
  const client = getGroqClient();
  const completion = await client.chat.completions.create({
    model: getGroqModel(),
    temperature: 0.2,
    messages: [
      { role: "system", content: input.systemPrompt },
      { role: "user", content: input.userMessage },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new ApiError("Groq returned an empty reply", 502);
  }
  return text;
}
