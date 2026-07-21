import { requireActiveMember } from "@/lib/db/groups";
import { buildChatContext } from "./context";
import { completeChat } from "./groq";
import { loadActiveAgreement, loadLiveGroupStatus } from "./statusAdapter";
import type { AgreementSnapshot, ChatContextSource } from "./types";

export interface AskSusuInput {
  groupId: number;
  userId: number;
  message: string;
  /**
   * Overrides the group's active agreement (loaded from the DB by default).
   * Mainly a test seam — production callers omit it.
   */
  activeAgreement?: AgreementSnapshot | null;
}

export interface AskSusuResult {
  reply: string;
  sources: ChatContextSource[];
  agreementMayBeStale: boolean;
  activeAgreementVersion: number | null;
}

/**
 * Grounded chat: live status → agreement (if any) → general FAQ → Groq.
 * Auth is MVP: caller must be an active member of the group.
 */
export async function askSusu(input: AskSusuInput): Promise<AskSusuResult> {
  requireActiveMember(input.groupId, input.userId);

  const status = loadLiveGroupStatus(input.groupId);
  const activeAgreement =
    input.activeAgreement ?? loadActiveAgreement(input.groupId);

  const ctx = buildChatContext({
    status,
    activeAgreement,
  });

  const reply = await completeChat({
    systemPrompt: ctx.systemPrompt,
    userMessage: input.message,
  });

  return {
    reply,
    sources: ctx.sources,
    agreementMayBeStale: ctx.agreementMayBeStale,
    activeAgreementVersion: ctx.activeAgreementVersion,
  };
}
