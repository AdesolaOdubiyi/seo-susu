/**
 * LLM helpers: context packager, FAQ, fixtures, Groq chat.
 */

export { buildChatContext } from "./context";
export { GENERAL_SUSU_FAQ, generalRulesExcerpt } from "./faq";
export { askSusu } from "./chat";
export {
  loadActiveAgreement,
  loadLiveGroupStatus,
  toLiveGroupStatus,
} from "./statusAdapter";
export {
  buildTemplateReminders,
  daysUntilDue,
  duePhrase,
  generateReminders,
  lateMembers,
  templateReminder,
} from "./reminders";
export type { Reminder, RemindersResult } from "./reminders";
export type * from "./types";
export type { AskSusuInput, AskSusuResult } from "./chat";
