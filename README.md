# Susu

A digital susu (rotating group savings) app that tracks contributions, rotation order, and simulated payouts for small trust-based groups.

## Tech Stack

- **Frontend / API:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Database:** SQLite (`better-sqlite3`)
- **LLM:** Groq (`groq-sdk`)

## Team

| Role | Owner | Ownership |
|------|-------|-----------|
| Person A | `[NAME]` | Data & backend — SQLite schema, group/member/rotation logic, `/groups` and `/contribute` endpoints, round advance |
| Person B | `[NAME]` | LLM & chat — Groq integration, grounded chat assistant, reminders, `/chat` endpoint |
| Person C | `[NAME]` | Frontend — group creation/join, dashboard, contribution status, chat widget, mobile layout |

## Getting Started

```bash
# Install dependencies
npm install

# Copy env placeholders and fill in values
cp .env.example .env.local

# Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
