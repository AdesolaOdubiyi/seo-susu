/**
 * LLM helpers: context packager, FAQ, fixtures.
 * Groq HTTP wiring lives in Branch 3 (`/api/chat`).
 */

export { buildChatContext } from "./context";
export { GENERAL_SUSU_FAQ, generalRulesExcerpt } from "./faq";
export type * from "./types";
