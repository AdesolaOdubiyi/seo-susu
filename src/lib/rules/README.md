# Rules policy

TypeScript helpers that encode `docs/CHANGE_RULES.md`.

- No SQLite, no HTTP, no Groq.
- Backend imports from `@/lib/rules` inside transactions.
- LLM context should never contradict these decisions.
