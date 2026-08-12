import type { Handler } from "@netlify/functions";
import { toMarkdown, toCSV } from "../../src/formatters";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { data, format, sourceName } = JSON.parse(event.body || "{}");

    if (!data || !data.testCases) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing test case data to export." }) };
    }

    if (format === "markdown") {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "text/markdown",
          "Content-Disposition": "attachment; filename=test-cases.md",
        },
        body: toMarkdown(data, sourceName || "PRD"),
      };
    }

    if (format === "csv") {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=test-cases.csv",
        },
        body: toCSV(data),
      };
    }

    return { statusCode: 400, body: JSON.stringify({ error: "format must be 'markdown' or 'csv'." }) };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message || "Export failed." }) };
  }
};
