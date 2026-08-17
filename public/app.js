if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

const SAMPLE_PRD = `Feature: Password Reset via Email

As a registered user who has forgotten their password,
I want to reset my password using a link sent to my registered email,
So that I can regain access to my account securely.

Requirements:
1. User enters their registered email on the "Forgot Password" page.
2. System sends a password reset link to the email if an account exists for it.
   - For security, the UI shows the same generic confirmation message regardless of whether the email is registered or not.
3. The reset link is valid for 30 minutes from the time it is generated.
4. Clicking the link takes the user to a "Set New Password" page.
5. The new password must be at least 8 characters, include at least one number and one special character.
6. Once the password is successfully reset, all existing sessions for that user are invalidated and the user must log in again.
7. If the link is expired or already used, the user sees an error message with an option to request a new link.
8. A user can request a new reset link at most 3 times within a 1-hour window (rate limiting to prevent abuse).`;

const CATEGORY_STYLES = {
  positive: { color: "#0E7C63", soft: "#E4F2ED", label: "Positive" },
  negative: { color: "#C2492E", soft: "#F7E9E4", label: "Negative" },
  edge: { color: "#A9791E", soft: "#F5EEDC", label: "Edge" },
  boundary: { color: "#4A5FC1", soft: "#E7E9F7", label: "Boundary" },
  security: { color: "#7A2E8C", soft: "#F1E4F5", label: "Security" },
};

const PRIORITY_STYLES = {
  P1: { color: "#C2492E", soft: "#F7E9E4" },
  P2: { color: "#A9791E", soft: "#F5EEDC" },
  P3: { color: "#5B6472", soft: "#EEEDE8" },
};

const LOADING_MESSAGES = [
  "Reading requirements…",
  "Mapping user flows…",
  "Drafting edge cases…",
  "Checking boundaries…",
  "Assembling coverage…",
];

const el = (id) => document.getElementById(id);

const prdInput = el("prdInput");
const charCount = el("charCount");
const generateBtn = el("generateBtn");
const generateBtnText = el("generateBtnText");
const loadSampleBtn = el("loadSampleBtn");
const uploadBtn = el("uploadBtn");
const clearBtn = el("clearBtn");
const fileInput = el("fileInput");
const fileName = el("fileName");
const errorMsg = el("errorMsg");
const statusDot = el("statusDot");
const statusText = el("statusText");

const emptyState = el("emptyState");
const loadingState = el("loadingState");
const loadingText = el("loadingText");
const results = el("results");
const summaryStrip = el("summaryStrip");
const resultsList = el("resultsList");
const coverageNotes = el("coverageNotes");
const exportButtons = el("exportButtons");
const exportCsvBtn = el("exportCsvBtn");

let lastResponse = null;
let loadingInterval = null;
let activeFilter = "all";

prdInput.addEventListener("input", updateCharCount);

loadSampleBtn.addEventListener("click", () => {
  prdInput.value = SAMPLE_PRD;
  updateCharCount();
  hideFileName();
  prdInput.focus();
});

uploadBtn.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  const nameLower = file.name.toLowerCase();
  const isPdf = nameLower.endsWith(".pdf");
  const isText = nameLower.endsWith(".txt") || nameLower.endsWith(".md");

  if (!isPdf && !isText) {
    showError("Please upload a .txt, .md, or .pdf file.");
    fileInput.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showError("File is too large. Please upload a file under 5MB.");
    fileInput.value = "";
    return;
  }

  hideError();

  try {
    let text;
    if (isPdf) {
      showFileName(file.name, "Extracting text…");
      text = await extractPdfText(file);
      if (!text || text.trim().length < 10) {
        showError("Couldn't extract readable text from this PDF — it may be scanned/image-based. Try pasting the text manually instead.");
        hideFileName();
        fileInput.value = "";
        return;
      }
    } else {
      text = await file.text();
    }

    prdInput.value = text;
    updateCharCount();
    showFileName(file.name);
  } catch (err) {
    console.error(err);
    showError("Could not read that file. Try pasting the text instead.");
    hideFileName();
  }

  fileInput.value = ""; // allow re-uploading the same file name later
});

async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    fullText += pageText + "\n\n";
  }

  return fullText.trim();
}

clearBtn.addEventListener("click", () => {
  prdInput.value = "";
  updateCharCount();
  hideFileName();
  hideError();
  prdInput.focus();
});

function updateCharCount() {
  charCount.textContent = `${prdInput.value.length} characters`;
}

function showFileName(name, statusLabel) {
  const label = statusLabel ? ` — ${escapeHtml(statusLabel)}` : "";
  fileName.innerHTML = `${escapeHtml(name)}${label}<button type="button" aria-label="Remove file">✕</button>`;
  fileName.hidden = false;
  fileName.querySelector("button").addEventListener("click", () => {
    prdInput.value = "";
    updateCharCount();
    hideFileName();
  });
}

function hideFileName() {
  fileName.hidden = true;
  fileName.innerHTML = "";
}

generateBtn.addEventListener("click", generate);

async function generate() {
  const prdText = prdInput.value.trim();
  hideError();

  if (prdText.length < 20) {
    showError("Paste a PRD or user story with at least a few sentences before generating.");
    return;
  }

  setBusy(true);
  showLoading();

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prdText }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Something went wrong generating test cases.");
    }

    lastResponse = data;
    renderResults(data);
    setStatus("ready", "Generated");
  } catch (err) {
    showError(err.message || "Failed to generate test cases. Check your API key and try again.");
    setStatus("error", "Error");
    showEmpty();
  } finally {
    setBusy(false);
  }
}

function setBusy(isBusy) {
  generateBtn.disabled = isBusy;
  generateBtnText.textContent = isBusy ? "Generating…" : "Generate test cases";
  if (isBusy) setStatus("busy", "Working");
}

function setStatus(state, text) {
  statusDot.className = "dot " + state;
  statusText.textContent = text;
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.hidden = false;
}
function hideError() {
  errorMsg.hidden = true;
}

function showEmpty() {
  emptyState.hidden = false;
  loadingState.hidden = true;
  results.hidden = true;
  clearInterval(loadingInterval);
}

function showLoading() {
  emptyState.hidden = true;
  loadingState.hidden = false;
  results.hidden = true;

  let i = 0;
  loadingText.textContent = LOADING_MESSAGES[0];
  clearInterval(loadingInterval);
  loadingInterval = setInterval(() => {
    i = (i + 1) % LOADING_MESSAGES.length;
    loadingText.textContent = LOADING_MESSAGES[i];
  }, 1400);
}

function renderResults(data) {
  clearInterval(loadingInterval);
  emptyState.hidden = true;
  loadingState.hidden = true;
  results.hidden = false;
  exportButtons.hidden = false;
  activeFilter = "all";

  renderSummaryChips(data);
  renderList(data);

  coverageNotes.innerHTML = `<strong>Coverage notes</strong>${escapeHtml(data.coverageNotes || "")}`;
}

function renderSummaryChips(data) {
  const byCategory = groupByCategory(data.testCases);

  summaryStrip.innerHTML = "";

  const totalChip = document.createElement("button");
  totalChip.type = "button";
  totalChip.className = "summary-chip total-chip" + (activeFilter === "all" ? " active" : "");
  totalChip.style.background = "#1C2430";
  totalChip.style.color = "#F7F6F2";
  totalChip.textContent = `${data.testCases.length} total`;
  totalChip.addEventListener("click", () => setFilter("all"));
  summaryStrip.appendChild(totalChip);

  for (const [cat, cases] of Object.entries(byCategory)) {
    const style = CATEGORY_STYLES[cat] || CATEGORY_STYLES.edge;
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "summary-chip" + (activeFilter === cat ? " active" : "");
    chip.style.background = style.soft;
    chip.style.color = style.color;
    chip.textContent = `${cases.length} ${style.label.toLowerCase()}`;
    chip.addEventListener("click", () => setFilter(cat));
    summaryStrip.appendChild(chip);
  }
}

function setFilter(filter) {
  activeFilter = filter;
  renderSummaryChips(lastResponse);
  renderList(lastResponse);
}

function renderList(data) {
  const byCategory = groupByCategory(data.testCases);
  resultsList.innerHTML = "";

  const categoriesToShow = activeFilter === "all" ? Object.keys(byCategory) : [activeFilter];

  for (const cat of categoriesToShow) {
    const cases = byCategory[cat];
    if (!cases) continue;
    const style = CATEGORY_STYLES[cat] || CATEGORY_STYLES.edge;

    const heading = document.createElement("div");
    heading.className = "category-heading";
    heading.style.color = style.color;
    heading.innerHTML = `<span class="category-dot" style="background:${style.color}"></span>${style.label} (${cases.length})`;
    resultsList.appendChild(heading);

    cases.forEach((tc, i) => {
      const card = renderCard(tc, style);
      card.style.animationDelay = `${Math.min(i * 30, 300)}ms`;
      resultsList.appendChild(card);
    });
  }
}

function groupByCategory(testCases) {
  const byCategory = {};
  for (const tc of testCases) {
    if (!byCategory[tc.category]) byCategory[tc.category] = [];
    byCategory[tc.category].push(tc);
  }
  return byCategory;
}

function renderCard(tc, style) {
  const card = document.createElement("div");
  card.className = "tc-card";
  card.style.borderLeftColor = style.color;

  const prio = PRIORITY_STYLES[tc.priority] || PRIORITY_STYLES.P3;

  const stepsHtml = (tc.steps || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("");

  card.innerHTML = `
    <div class="tc-head">
      <span class="tc-id">${escapeHtml(tc.id)}</span>
      <span class="tc-title">${escapeHtml(tc.title)}</span>
      <span class="tc-priority" style="background:${prio.soft};color:${prio.color}">${escapeHtml(tc.priority)}</span>
    </div>
    <div class="tc-meta"><strong>Preconditions:</strong> ${escapeHtml(tc.preconditions || "—")}</div>
    <ol class="tc-steps">${stepsHtml}</ol>
    <div class="tc-expected"><strong>Expected:</strong> ${escapeHtml(tc.expectedResult)}</div>
  `;
  return card;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function exportCSV() {
  if (!lastResponse) return;
  try {
    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: lastResponse, format: "csv", sourceName: "PRD" }),
    });
    if (!res.ok) throw new Error("Export failed.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "test-cases.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    showError("Could not export file. Try generating again.");
  }
}

exportCsvBtn.addEventListener("click", exportCSV);
