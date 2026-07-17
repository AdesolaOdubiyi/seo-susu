# LLM

- `buildChatContext` — packs live status → agreement → general rules
- `faq.ts` — general Susu Q&A from `docs/CHANGE_RULES.md`
- `statusAdapter.ts` — maps `getGroupStatus` + open polls → `LiveGroupStatus`
- `chat.ts` / `groq.ts` — grounded Groq replies for `POST /api/chat`
- `fixtures/` — sample data for tests without a live DB

Agreement snapshots are `null` until backend adds `group_agreements`. Chat still answers from live status + general FAQ.
