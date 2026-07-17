import { generalRulesExcerpt } from "./faq";
import type {
  AgreementSnapshot,
  BuildChatContextInput,
  ChatContext,
  ChatContextSource,
  LiveGroupStatus,
} from "./types";

const SYSTEM_PREAMBLE = `You are Susu's group assistant. Speak in plain language for adults who may be new to finance apps.

Rules for answering:
1. Prefer live group status over the signed agreement when they conflict. If they conflict, say the agreement may be outdated and use live facts.
2. Use the group agreement for this group's amount, cadence, payout order, and signed terms.
3. Use general rules only for "what is a susu / round / cycle" style questions, or when group data is missing.
4. This MVP is simulation only. Never claim real bank transfers, insurance, or guaranteed collection.
5. If you lack a fact, say you do not know. Do not invent members, amounts, or poll outcomes.
6. When citing this group's terms, mention the agreement version if available.`;

function formatLiveStatus(status: LiveGroupStatus): string {
  const missing = status.members
    .filter((m) => m.active && !m.contributedThisRound)
    .map((m) => m.name);
  const lines = [
    `Group: ${status.groupName} (id ${status.groupId})`,
    `Phase: ${status.phase}`,
    `Cycle ${status.currentCycle}, round ${status.currentRound}`,
    `Cadence: ${status.cadence}`,
    `Contribution amount: ${status.contributionAmount}`,
    `Current pot: ${status.pot}`,
    `Round due at: ${status.roundDueAt}`,
    `Stalled: ${status.stalled ? "yes" : "no"}`,
    `Payout blocked: ${status.payoutBlocked ? "yes" : "no"}${
      status.payoutBlockedReason ? ` (${status.payoutBlockedReason})` : ""
    }`,
    `Next recipient: ${
      status.nextRecipient
        ? `${status.nextRecipient.name} (user ${status.nextRecipient.userId})`
        : "none"
    }`,
    `Active members still owing this round: ${
      missing.length ? missing.join(", ") : "none"
    }`,
    "Members:",
    ...status.members.map(
      (m) =>
        `- ${m.name} (user ${m.userId}): pos ${m.rotationPosition}, active=${m.active}, paid_this_cycle=${m.payoutReceivedThisCycle}, contributed_this_round=${m.contributedThisRound}`,
    ),
    `Open polls: ${
      status.openPolls.length === 0
        ? "none"
        : status.openPolls
            .map(
              (p) =>
                `#${p.id} ${p.changeType} status=${p.status} deadline=${p.deadline}`,
            )
            .join("; ")
    }`,
  ];
  return lines.join("\n");
}

function formatAgreement(agreement: AgreementSnapshot): string {
  const order = agreement.payoutOrder
    .slice()
    .sort((a, b) => a.rotationPosition - b.rotationPosition)
    .map((m) => `${m.rotationPosition}. ${m.name} (user ${m.userId})`)
    .join("\n");
  return [
    `Agreement version: ${agreement.version}`,
    `Cycle number on agreement: ${agreement.cycleNumber}`,
    `Effective at: ${agreement.effectiveAt ?? "not effective yet"}`,
    `Content hash: ${agreement.contentHash}`,
    `Group: ${agreement.groupName}`,
    `Contribution amount: ${agreement.contributionAmount}`,
    `Cadence: ${agreement.cadence}`,
    `Expected pot at signing: ${agreement.expectedPot}`,
    `Round 1 start: ${agreement.round1StartAt}`,
    "Payout order:",
    order || "(empty)",
    `Disclaimer: ${agreement.simulationDisclaimer}`,
  ].join("\n");
}

function detectStale(
  status: LiveGroupStatus | null,
  agreement: AgreementSnapshot | null,
): string[] {
  if (!status || !agreement) return [];
  const notes: string[] = [];
  if (status.contributionAmount !== agreement.contributionAmount) {
    notes.push(
      `Live contribution amount (${status.contributionAmount}) differs from agreement v${agreement.version} (${agreement.contributionAmount}).`,
    );
  }
  if (status.cadence !== agreement.cadence) {
    notes.push(
      `Live cadence (${status.cadence}) differs from agreement v${agreement.version} (${agreement.cadence}).`,
    );
  }
  if (status.pot !== agreement.expectedPot) {
    notes.push(
      `Live pot (${status.pot}) differs from agreement expected pot (${agreement.expectedPot}). Membership or amount may have changed.`,
    );
  }
  if (status.stalled) {
    notes.push(
      "Live status shows the round is stalled (past due with missing contributions). Prefer this over any agreement wording that assumes the round is on track.",
    );
  }
  if (status.payoutBlocked) {
    notes.push(
      `Live status shows payout is blocked${
        status.payoutBlockedReason ? `: ${status.payoutBlockedReason}` : ""
      }.`,
    );
  }
  return notes;
}

/**
 * Pack chat grounding with strict priority:
 * live status → active agreement → general rules.
 */
export function buildChatContext(input: BuildChatContextInput): ChatContext {
  const general = input.generalRulesExcerpt ?? generalRulesExcerpt();
  const staleNotes = detectStale(input.status, input.activeAgreement);
  const sections: ChatContext["sections"] = [];
  const sources: ChatContextSource[] = [];

  if (input.status) {
    sections.push({
      id: "live_status",
      title: "Live group status (highest priority)",
      body: formatLiveStatus(input.status),
    });
    sources.push({
      kind: "live_status",
      label: `Group ${input.status.groupId} live status`,
      detail: `cycle ${input.status.currentCycle} round ${input.status.currentRound}`,
    });
  } else {
    sections.push({
      id: "live_status",
      title: "Live group status (highest priority)",
      body: "No live group status was provided. Say you do not have live data for this group.",
    });
  }

  if (input.activeAgreement) {
    let body = formatAgreement(input.activeAgreement);
    if (staleNotes.length > 0) {
      body += `\n\nStale / conflict notes (live wins):\n${staleNotes.map((n) => `- ${n}`).join("\n")}`;
    }
    sections.push({
      id: "group_agreement",
      title: "This group's agreement (structured snapshot)",
      body,
    });
    sources.push({
      kind: "group_agreement",
      label: `Agreement v${input.activeAgreement.version}`,
      detail: input.activeAgreement.contentHash,
    });
  } else {
    sections.push({
      id: "group_agreement",
      title: "This group's agreement (structured snapshot)",
      body: "No active agreement snapshot was provided. Do not invent signed terms. You may still answer general susu questions.",
    });
  }

  sections.push({
    id: "general_rules",
    title: "General Susu rules (lowest priority)",
    body: general,
  });
  sources.push({
    kind: "general_rules",
    label: "General Susu FAQ",
  });

  const systemPrompt = [
    SYSTEM_PREAMBLE,
    "",
    ...sections.map((s) => `## ${s.title}\n${s.body}`),
  ].join("\n");

  return {
    sections,
    sources,
    agreementMayBeStale: staleNotes.length > 0,
    staleNotes,
    activeAgreementVersion: input.activeAgreement?.version ?? null,
    systemPrompt,
  };
}
