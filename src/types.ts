export type TestCategory = "positive" | "negative" | "edge" | "boundary" | "security";
export type Priority = "P1" | "P2" | "P3";

export interface TestCase {
  id: string;
  title: string;
  category: TestCategory;
  priority: Priority;
  preconditions: string;
  steps: string[];
  expectedResult: string;
}

export interface TestCaseResponse {
  testCases: TestCase[];
  coverageNotes: string;
}
