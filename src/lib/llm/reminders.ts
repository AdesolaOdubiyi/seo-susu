import { completeChat, isGroqConfigured } from "./groq";
import { loadLiveGroupStatus } from "./statusAdapter";
import type { LiveGroupStatus } from "./types";

// Auto-generated reminders (docs/CHANGE_RULES.md §"Polish"; Person B lane).
// Nudge active members who have not marked their contribution for the current
// round. A deterministic template is the source of truth so reminders work
// without a Groq key; Groq is optional wording polish on top, and any failure
// falls back to the template.

export interface Reminder {
  userId: number;
  name: string;
  message: string;
}

export interface RemindersResult {
  groupId: number;
  groupName: string;
  phase: string;
  currentCycle: number;
  currentRound: number;
  dueAt: string;
  daysUntilDue: number;
  stalled: boolean;
  /** Whether the wording came from Groq or the built-in template. */
  source: "groq" | "template";
  reminders: Reminder[];
}

const MAX_MESSAGE_LENGTH = 240;

/** Whole UTC-ish days until (negative = overdue) the round due date. */
export function daysUntilDue(dueAt: string, now: Date = new Date()): number {
  return Math.round((new Date(dueAt).getTime() - now.getTime()) / 86_400_000);
}

/** Active members who still owe a contribution this round. */
export function lateMembers(status: LiveGroupStatus): LiveGroupStatus["members"] {
  return status.members.filter((m) => m.active && !m.contributedThisRound);
}

/** Plain-language phrasing for the deadline relative to now. */
export function duePhrase(days: number, stalled: boolean): string {
  if (days < 0) {
    const ago = Math.abs(days);
    return `was due ${ago} day${ago === 1 ? "" : "s"} ago`;
  }
  if (stalled) return "is overdue";
  if (days === 0) return "is due today";
  if (days === 1) return "is due tomorrow";
  return `is due in ${days} days`;
}

/** Deterministic, jargon-free nudge. Needs no LLM. */
export function templateReminder(input: {
  name: string;
  groupName: string;
  amount: number;
  days: number;
  stalled: boolean;
}): string {
  const when = duePhrase(input.days, input.stalled);
  return `Hi ${input.name}, your $${input.amount} contribution to ${input.groupName} ${when}. Mark it as sent once you've paid. (Simulated — no real money moves.)`;
}

/**
 * Template reminders for every late member. Empty unless the group is live —
 * "who owes this round" only applies once the rotation has started. Pure.
 */
export function buildTemplateReminders(status: LiveGroupStatus): Reminder[] {
  if (status.phase !== "live") return [];
  const days = daysUntilDue(status.roundDueAt);
  return lateMembers(status).map((m) => ({
    userId: m.userId,
    name: m.name,
    message: templateReminder({
      name: m.name,
      groupName: status.groupName,
      amount: status.contributionAmount,
      days,
      stalled: status.stalled,
    }),
  }));
}

function metaFrom(status: LiveGroupStatus): Omit<RemindersResult, "source" | "reminders"> {
  return {
    groupId: status.groupId,
    groupName: status.groupName,
    phase: status.phase,
    currentCycle: status.currentCycle,
    currentRound: status.currentRound,
    dueAt: status.roundDueAt,
    daysUntilDue: daysUntilDue(status.roundDueAt),
    stalled: status.stalled,
  };
}

/**
 * Generate reminders for a group's late members, grounded in live status.
 * Uses Groq for warmer wording when configured (and not forced off); otherwise
 * — or if Groq errors or returns unusable output — uses the template verbatim.
 */
export async function generateReminders(
  groupId: number,
  opts: { useGroq?: boolean } = {},
): Promise<RemindersResult> {
  const status = loadLiveGroupStatus(groupId);
  const meta = metaFrom(status);
  const templated = buildTemplateReminders(status);

  const wantGroq = opts.useGroq ?? isGroqConfigured();
  if (!wantGroq || templated.length === 0) {
    return { ...meta, source: "template", reminders: templated };
  }

  try {
    return { ...meta, source: "groq", reminders: await polishWithGroq(status, templated) };
  } catch {
    return { ...meta, source: "template", reminders: templated };
  }
}

/**
 * Ask Groq to rewrite each templated reminder more warmly, strictly grounded:
 * it may only rephrase, never change names/amounts/dates. Any member Groq
 * omits or mangles keeps the template wording.
 */
async function polishWithGroq(
  status: LiveGroupStatus,
  templated: Reminder[],
): Promise<Reminder[]> {
  const systemPrompt = `You write short, warm, plain-language payment reminders for a rotating savings group (a "susu").
Rules:
- Write exactly one reminder per member listed.
- Use ONLY the facts you are given. Never invent or change names, amounts, or dates.
- Keep each message under ${MAX_MESSAGE_LENGTH} characters. Friendly, never pushy. No finance jargon.
- Payouts are simulated; never imply real money moved.
Return ONLY a JSON array of {"userId": number, "message": string}, one entry per member.`;

  const facts = templated
    .map((r) => `- userId ${r.userId} (${r.name}) owes $${status.contributionAmount}`)
    .join("\n");
  const userMessage = `Group "${status.groupName}". The round ${duePhrase(
    daysUntilDue(status.roundDueAt),
    status.stalled,
  )}.\nMembers to remind:\n${facts}`;

  const raw = await completeChat({ systemPrompt, userMessage });
  const parsed = JSON.parse(extractJsonArray(raw)) as unknown;
  if (!Array.isArray(parsed)) throw new Error("Groq did not return a JSON array");

  const byId = new Map<number, string>();
  for (const item of parsed) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as { userId?: unknown }).userId === "number" &&
      typeof (item as { message?: unknown }).message === "string"
    ) {
      const { userId, message } = item as { userId: number; message: string };
      const trimmed = message.trim();
      if (trimmed) byId.set(userId, trimmed.slice(0, MAX_MESSAGE_LENGTH));
    }
  }

  return templated.map((r) => ({ ...r, message: byId.get(r.userId) ?? r.message }));
}

/** Pull the first JSON array out of a model reply (tolerates prose/code fences). */
function extractJsonArray(text: string): string {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON array in Groq reply");
  }
  return text.slice(start, end + 1);
}
