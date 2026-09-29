# Jumpbar global leaderboard

Live: https://jumpbar.pages.dev/ (Cloudflare Pages and D1, free-tier services).
Database: jumpbar-scores. Binding DB is configured in wrangler.json.

Deploy future updates:

    node --test physics.test.js campaign.test.js server/server.test.mjs
    node server/build.mjs
    npx wrangler pages deploy dist --project-name=jumpbar --branch=main

For schema changes, use additive migrations; never reset the production database.

Local preview: node server/build.mjs, then node server/dev.mjs. The local SQLite database is temporary and only listens on 127.0.0.1:8788.

Rules:
- Best landed jump excludes combo multiplier bonuses and requires a new bar or successful finish.
- Course records require a successful finish; the overall run score also includes unsuccessful attempts.
- Successful course completion counts once per UTC day. Missing a day resets the current streak, not the longest streak.
- Public nickname and records; random bearer token stays in browser storage, only its SHA-256 hash is stored on the server. Losing browser storage loses the player identity (no account recovery).
- Start receipts expire after 20 minutes and are single use. The server checks input sizes, ranges, timing, same-origin writes and submission frequency.
- Casual leaderboard: scores are client-reported with sanity checks, not replay-verified anti-cheat. A modified client could submit plausible fake results. Do not use for competitive prizes.
- Existing local scores and past streaks are never invented or uploaded.
- The old GitHub site links here and imports campaign progress into an empty save only. Existing destination progress is never overwritten.
- Free-tier quotas may temporarily prevent online submissions; local play continues. No paid domain or plan was purchased.
