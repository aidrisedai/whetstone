#!/usr/bin/env node
/**
 * Smoke tests for all Whetstone API endpoints in demo mode.
 * Starts `next start` (requires a prior `npm run build`), runs requests, exits.
 *
 * Usage: npm run test:smoke   (or: node scripts/smoke-test.mjs)
 */

import { spawn } from "child_process";
import { setTimeout as sleep } from "timers/promises";

const PORT = 3001;
const BASE = `http://localhost:${PORT}`;

let pass = 0;
let fail = 0;

async function post(path, body) {
  return fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function expectOk(label, path, body) {
  try {
    const res = await post(path, body);
    if (res.ok) {
      console.log(`  ✓ ${label} (${res.status})`);
      pass++;
    } else {
      const text = await res.text();
      console.error(`  ✗ ${label} — ${res.status}: ${text.slice(0, 200)}`);
      fail++;
    }
  } catch (err) {
    console.error(`  ✗ ${label} — ${err.message}`);
    fail++;
  }
}

async function expectStream(label, path, body) {
  try {
    const res = await post(path, body);
    if (!res.ok) {
      const text = await res.text();
      console.error(`  ✗ ${label} — ${res.status}: ${text.slice(0, 200)}`);
      fail++;
      return;
    }
    const reader = res.body.getReader();
    const { value } = await reader.read();
    await reader.cancel();
    if (value && value.length > 0) {
      console.log(`  ✓ ${label} (${value.length} bytes)`);
      pass++;
    } else {
      console.error(`  ✗ ${label} — empty stream`);
      fail++;
    }
  } catch (err) {
    console.error(`  ✗ ${label} — ${err.message}`);
    fail++;
  }
}

const HISTORY = [
  { role: "user", content: "I want to build a math homework tracker for students" },
  { role: "assistant", content: "Who exactly are the students — what grade and subject?" },
  { role: "user", content: "High school students struggling with algebra homework" },
];
const REFINED = "Build a math homework tracker for high school algebra students with reminders and progress charts.";
const PART = {
  title: "The Stage",
  whatItIs: "Main screen with your app's name",
  concept: "HTML structure",
  buildSpec: "Create HTML page with styled header and empty main area.",
};

async function runTests() {
  console.log("Running smoke tests (demo mode)…\n");

  await expectStream("POST /api/advisor", "/api/advisor", { history: HISTORY, threshold: 80, demoMode: true });
  await expectOk("POST /api/score", "/api/score", { history: HISTORY, criteria: null });
  await expectOk("POST /api/lesson", "/api/lesson", { history: HISTORY, refinedPrompt: REFINED, demoMode: true });
  await expectOk("POST /api/export", "/api/export", { refinedPrompt: REFINED, builder: "bolt", demoMode: true });
  await expectOk("POST /api/plan", "/api/plan", { refinedPrompt: REFINED, demoMode: true });
  await expectOk("POST /api/board", "/api/board", {
    projectName: "Math Tracker", bigPicture: "tracker", part: PART,
    partNumber: 1, totalParts: 3, demoMode: true,
  });
  await expectStream("POST /api/board-chat", "/api/board-chat", {
    studentSaid: "I'm not sure what a variable is",
    part: { title: "The Stage", concept: "HTML structure" },
    demoMode: true,
  });
  await expectOk("POST /api/quiz", "/api/quiz", {
    concept: "variables", code: "let x = 5;", newCode: "let count = 0;", demoMode: true,
  });
  await expectOk("POST /api/coach", "/api/coach", {
    refinedPrompt: REFINED, demoMode: true,
  });
  await expectOk("POST /api/lesson-build", "/api/lesson-build", {
    part: PART, demoMode: true,
  });
  await expectStream("POST /api/build", "/api/build", {
    refinedPrompt: REFINED, demoMode: true,
  });
  await expectStream("POST /api/extend", "/api/extend", {
    request: "Add a delete button to each list item", demoMode: true,
  });
  await expectOk("POST /api/edit", "/api/edit", {
    currentCode: "<h1>App</h1>", changeRequest: "Add a subtitle", demoMode: true,
  });
  await expectStream("POST /api/code-ask", "/api/code-ask", {
    studentSaid: "What does let do?", demoMode: true,
  });

  console.log(`  – /api/speak skipped (requires Google TTS credentials)\n`);
}

// ── Server lifecycle ────────────────────────────────────────────────────────

async function waitForServer(maxMs = 30_000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/`);
      if (r.ok || r.status === 404) return true;
    } catch { /* not up yet */ }
    await sleep(500);
  }
  return false;
}

const server = spawn("npx", ["next", "start", "--port", String(PORT)], {
  env: { ...process.env, PORT: String(PORT), ANTHROPIC_API_KEY: "" },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stderr.on("data", () => {});

console.log(`Starting server on port ${PORT}…`);
const ready = await waitForServer();
if (!ready) {
  console.error("Server did not start within 30 s");
  server.kill();
  process.exit(1);
}

try {
  await runTests();
} finally {
  server.kill();
}

console.log(`Results: ${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
