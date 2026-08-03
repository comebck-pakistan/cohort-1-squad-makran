# Non-negotiable rules

- **No em dashes (—) anywhere in the frontend** (code, copy, comments, mock data). Use a period, comma, colon, semicolon, or parentheses depending on what the sentence needs. For a UI placeholder representing "no value," use an en dash (–), not an em dash. For a short label separator, follow the existing `·` (middot) convention already used across the app (e.g. `formatDateTime(...)} · Google Meet`).
- **Dev server runs in a separate terminal the user manages directly on port 3000.** Never start it yourself (no `npm run dev`, no `preview_start` with a launch.json name). For browser verification, `navigate`/`preview_start` with a plain `url` (e.g. `http://localhost:3000`) against the already-running server instead.
