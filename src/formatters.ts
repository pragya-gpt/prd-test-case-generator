import { TestCaseResponse, TestCase } from "./types";

export function toMarkdown(response: TestCaseResponse, sourceFile: string): string {
  const lines: string[] = [];
  lines.push(`# Test Cases — Generated from ${sourceFile}`);
  lines.push(`\n_Generated on ${new Date().toISOString().split("T")[0]}_\n`);

  const byCategory: Record<string, TestCase[]> = {};
  for (const tc of response.testCases) {
    if (!byCategory[tc.category]) byCategory[tc.category] = [];
    byCategory[tc.category].push(tc);
  }

  for (const [category, cases] of Object.entries(byCategory)) {
    lines.push(`## ${category.charAt(0).toUpperCase() + category.slice(1)} Cases (${cases.length})\n`);
    for (const tc of cases) {
      lines.push(`### ${tc.id}: ${tc.title}`);
      lines.push(`**Priority:** ${tc.priority}  `);
      lines.push(`**Preconditions:** ${tc.preconditions}\n`);
      lines.push(`**Steps:**`);
      tc.steps.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
      lines.push(`\n**Expected Result:** ${tc.expectedResult}\n`);
    }
  }

  lines.push(`## Coverage Notes\n`);
  lines.push(response.coverageNotes);

  return lines.join("\n");
}

export function toCSV(response: TestCaseResponse): string {
  const header = ["ID", "Title", "Category", "Priority", "Preconditions", "Steps", "Expected Result"];
  const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;

  const rows = response.testCases.map((tc) =>
    [
      tc.id,
      tc.title,
      tc.category,
      tc.priority,
      tc.preconditions,
      tc.steps.map((s, i) => `${i + 1}. ${s}`).join(" | "),
      tc.expectedResult,
    ]
      .map(escape)
      .join(",")
  );

  return [header.map(escape).join(","), ...rows].join("\n");
}
