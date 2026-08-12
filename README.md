# PRD → Test Case Generator (Netlify Edition)

A web app that reads a PRD or user story and generates a structured QA test case suite
(positive, negative, edge, boundary, security scenarios) using Google's **free** Gemini API.
This version is built to deploy on **Netlify** — static frontend + serverless functions,
no server to manage.

## Local setup

1. Install [Node.js](https://nodejs.org) (v18+).
2. Get a free API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) —
   no card required.
3. In this folder:
   ```bash
   npm install
   cp .env.example .env
   ```
4. Paste your key into `.env`:
   ```
   GEMINI_API_KEY=AIzaxxxxxxxx
   ```

## Run it locally (same environment as Netlify's production)

```bash
npx netlify dev
```

This runs the static frontend AND the serverless functions together, exactly as they'll behave
once deployed — this is the correct way to test locally, not `node server.js` (there is no
persistent server in this version).

Open the URL it prints (usually **http://localhost:8888**).

## Deploy to Netlify (get a public shareable link)

1. Push this project to a GitHub repo (make sure `.gitignore` is in place first — never commit `.env`).
2. Go to **netlify.com**, sign up free (GitHub login is easiest).
3. Click **Add new site → Import an existing project**, connect GitHub, select this repo.
4. Netlify auto-detects `netlify.toml` — build settings should be pre-filled. Just confirm and deploy.
5. Before or after the first deploy, go to **Site configuration → Environment variables** and add:
   - Key: `GEMINI_API_KEY` → Value: your actual key
6. Trigger a redeploy if you added the env var after the first deploy (**Deploys → Trigger deploy**).

You'll get a public URL like:
```
https://your-site-name.netlify.app
```
That's the link you share.

## How this differs from a typical Express app

Netlify doesn't run persistent servers — it serves static files and runs **serverless functions**
per-request. So instead of one `server.ts` handling all routes, this project has:

```
netlify/functions/
  generate.ts   — replaces POST /api/generate
  export.ts     — replaces POST /api/export
```

`netlify.toml` redirects any request to `/api/*` into `/.netlify/functions/*`, so the frontend
code (`public/app.js`) didn't need to change at all — it still calls `/api/generate` like normal.

## Project structure

```
src/
  types.ts        — TypeScript interfaces
  prompt.ts       — System prompt + prompt builder
  gemini.ts        — Gemini API call + response parsing (shared by CLI and functions)
  formatters.ts    — Converts model output into Markdown and CSV
  index.ts         — Optional CLI (npm run cli -- sample-prd.txt)
netlify/functions/
  generate.ts       — Serverless function: calls Gemini, returns test cases
  export.ts         — Serverless function: returns downloadable .md/.csv
public/
  index.html, style.css, app.js — the web UI
netlify.toml         — Netlify build + redirect configuration
```

## Things worth knowing before sharing the link widely

- **Every visitor uses your API key and quota.** Gemini's free tier is generous, but a link
  shared publicly (not just with a few recruiters) could hit rate limits under heavy traffic.
- **Cold starts.** Serverless functions spin up per request; the very first request after
  inactivity may take a second or two longer than subsequent ones. Normal behavior, not a bug.
- **Talking point for interviews:** this project demonstrates understanding of both server-based
  (Express) and serverless (Netlify Functions) deployment models for the same application logic —
  worth mentioning if asked about your AI project's architecture.
