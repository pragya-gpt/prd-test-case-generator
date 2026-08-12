import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

const GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function callGemini(prdText: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "Missing GEMINI_API_KEY. Set it in your environment (locally via .env, or in Netlify's Environment Variables dashboard)."
    );
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${SYSTEM_PROMPT}\n\n${buildUserPrompt(prdText)}` }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as any;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(`Unexpected Gemini response shape: ${JSON.stringify(data)}`);
  }
  return text;
}

export function parseTestCaseResponse(rawText: string) {
  const cleaned = rawText.replace(/^```json\s*|```$/g, "").trim();
  return JSON.parse(cleaned);
}
