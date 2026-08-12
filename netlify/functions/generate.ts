import type { Handler } from "@netlify/functions";
import { callGemini, parseTestCaseResponse } from "../../src/gemini";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { prdText } = JSON.parse(event.body || "{}");

    if (!prdText || prdText.trim().length < 20) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Please provide a PRD/user story with at least a few sentences." }),
      };
    }

    const rawText = await callGemini(prdText);
    const parsed = parseTestCaseResponse(rawText);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Failed to generate test cases." }),
    };
  }
};
