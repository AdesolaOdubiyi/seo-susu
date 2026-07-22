import { generalRulesExcerpt } from "./faq";
import { payoutPausedMessage, pollTypeLabel } from "@/lib/ui/labels";
import type {
  AgreementSnapshot,
  BuildChatContextInput,
  ChatContext,
  ChatContextSource,
  LiveGroupStatus,
} from "./types";

const SYSTEM_PREAMBLE = `You are Susu's group assistant. Answer like a calm, clear friend in the circle. Many members are adults who are new to finance apps.

How to answer:
1. Prefer the latest group details over the signed agreement when they differ. If they differ, say the signed terms may lag and use the latest details.
2. Use the group agreement for amount, contribution schedule, payout order, and signed terms.
3. Use the general notes only for “what is a susu” questions, or when group details are missing.
4. This version is practice only. Never claim real bank transfers, insurance, or guaranteed collection.
5. If you do not know, say so. Do not invent members, amounts, or vote results.
6. Keep sentences short. Use people's names. Never mention database fields, IDs, hashes, or codes like missing_contributions.
7. When talking about this group's terms, you can say “under this group's current agreement” and the version number if you have it.`;

function formatLiveStatus(status: LiveGroupStatus): string {
  const missing = status.members
    .filter((m) => m.active && !m.contributedThisRound)
    .map((m) => m.name);
  const contributed = status.members
    .filter((m) => m.active && m.contributedThisRound)
    .map((m) => m.name);
  const lines = [
    `Group name: ${status.groupName}`,
    `Stage: ${status.phase}`,
    `Cycle ${status.currentCycle}, round ${status.currentRound}`,
    `How often: ${status.cadence}`,
    `Contribution amount: $${status.contributionAmount}`,
    `Current pot: $${status.pot}`,
    `Round due: ${status.roundDueAt}`,
    `Overdue: ${status.stalled ? "yes" : "no"}`,
    `Payout waiting: ${
      status.payoutBlocked
        ? payoutPausedMessage(status.payoutBlockedReason)
        : "no"
    }`,
    `Next to receive the pot: ${
      status.nextRecipient ? status.nextRecipient.name : "nobody yet"
    }`,
    `Still need to contribute this round: ${
      missing.length ? missing.join(", ") : "everyone has contributed"
    }`,
    `Already contributed this round: ${
      contributed.length ? contributed.join(", ") : "nobody yet"
    }`,
    "Members in payout order:",
    ...status.members
      .slice()
      .sort((a, b) => a.rotationPosition - b.rotationPosition)
      .map((m) => {
        const bits = [
          m.name,
          m.active ? "active" : "left",
          m.payoutReceivedThisCycle
            ? "already received this cycle"
            : "not yet received this cycle",
        ];
        return `- ${bits.join("; ")}`;
      }),
    `Open votes: ${
      status.openPolls.length === 0
        ? "none"
        : status.openPolls
            .map(
              (p) =>
                `${pollTypeLabel(p.changeType)} (${p.status}, due ${p.deadline})`,
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
    .map((m) => `${m.rotationPosition}. ${m.name}`)
    .join("\n");
  return [
    `Agreement version: ${agreement.version}`,
    `Effective: ${agreement.effectiveAt ?? "not active yet"}`,
    `Group: ${agreement.groupName}`,
    `Contribution amount: $${agreement.contributionAmount}`,
    `How often: ${agreement.cadence}`,
    `Expected pot when signed: $${agreement.expectedPot}`,
    `Round 1 start: ${agreement.round1StartAt}`,
    "Payout order:",
    order || "(empty)",
    `Note: ${agreement.simulationDisclaimer}`,
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
      `The live contribution amount ($${status.contributionAmount}) differs from agreement version ${agreement.version} ($${agreement.contributionAmount}).`,
    );
  }
  if (status.cadence !== agreement.cadence) {
    notes.push(
      `How often people contribute (${status.cadence}) differs from agreement version ${agreement.version} (${agreement.cadence}).`,
    );
  }
  if (status.pot !== agreement.expectedPot) {
    notes.push(
      `The live pot ($${status.pot}) differs from the pot on the signed agreement ($${agreement.expectedPot}). Membership or the amount may have changed.`,
    );
  }
  if (status.stalled) {
    notes.push(
      "This round is overdue and some contributions are still missing. Prefer that over older wording that assumes everything is on time.",
    );
  }
  if (status.payoutBlocked) {
    notes.push(payoutPausedMessage(status.payoutBlockedReason));
  }
  return notes;
}

/** Build chat grounding: live status, then agreement, then general rules. */
export function buildChatContext(input: BuildChatContextInput): ChatContext {
  const general = input.generalRulesExcerpt ?? generalRulesExcerpt();
  const staleNotes = detectStale(input.status, input.activeAgreement);
  const sections: ChatContext["sections"] = [];
  const sources: ChatContextSource[] = [];

  if (input.status) {
    sections.push({
      id: "live_status",
      title: "Latest group details (use these first)",
      body: formatLiveStatus(input.status),
    });
    sources.push({
      kind: "live_status",
      label: "Latest group details",
      detail: `${input.status.groupName}, cycle ${input.status.currentCycle} round ${input.status.currentRound}`,
    });
  } else {
    sections.push({
      id: "live_status",
      title: "Latest group details (use these first)",
      body: "No live group details were provided. Say you do not have the latest information for this group.",
    });
  }

  if (input.activeAgreement) {
    let body = formatAgreement(input.activeAgreement);
    if (staleNotes.length > 0) {
      body += `\n\nNotes when details differ (prefer latest group details):\n${staleNotes.map((n) => `- ${n}`).join("\n")}`;
    }
    sections.push({
      id: "group_agreement",
      title: "This group's signed agreement",
      body,
    });
    sources.push({
      kind: "group_agreement",
      label: `Agreement version ${input.activeAgreement.version}`,
    });
  } else {
    sections.push({
      id: "group_agreement",
      title: "This group's signed agreement",
      body: "No signed agreement was provided. Do not invent signed terms. You may still answer general susu questions.",
    });
  }

  sections.push({
    id: "general_rules",
    title: "General susu notes (use last)",
    body: general,
  });
  sources.push({
    kind: "general_rules",
    label: "General susu guide",
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
