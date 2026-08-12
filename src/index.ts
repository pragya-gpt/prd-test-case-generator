import fs from "fs";
import path from "path";
import "dotenv/config";
import { callGemini, parseTestCaseResponse } from "./gemini";
import { toMarkdown, toCSV } from "./formatters";
import { TestCaseResponse } from "./types";

async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    console.error("Usage: npm run cli -- <path-to-prd-file.txt>");
    process.exit(1);
  }

  const resolvedPath = path.resolve(inputPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  const prdText = fs.readFileSync(resolvedPath, "utf-8");
  console.log(`Read PRD (${prdText.length} chars). Calling Gemini...`);

  let parsed: TestCaseResponse;
  try {
    const rawText = await callGemini(prdText);
    parsed = parseTestCaseResponse(rawText);
  } catch (err) {
    console.error("Failed to generate test cases:", err);
    process.exit(1);
  }

  const baseName = path.basename(inputPath, path.extname(inputPath));
  const outDir = path.resolve("output");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  const mdPath = path.join(outDir, `${baseName}-test-cases.md`);
  const csvPath = path.join(outDir, `${baseName}-test-cases.csv`);

  fs.writeFileSync(mdPath, toMarkdown(parsed, inputPath));
  fs.writeFileSync(csvPath, toCSV(parsed));

  console.log(`\nGenerated ${parsed.testCases.length} test cases.`);
  console.log(`Markdown: ${mdPath}`);
  console.log(`CSV:      ${csvPath}`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
