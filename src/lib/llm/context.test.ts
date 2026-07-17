import { describe, expect, it } from "vitest";
import { buildChatContext } from "./context";
import { generalRulesExcerpt } from "./faq";
import {
  fixtureHealthyLiveStatus,
  fixtureStaleAgreement,
  fixtureStalledLiveStatus,
} from "./fixtures/demo-group";

describe("buildChatContext", () => {
  it("orders sections live → agreement → general", () => {
    const ctx = buildChatContext({
      status: fixtureHealthyLiveStatus,
      activeAgreement: fixtureStaleAgreement,
    });
    expect(ctx.sections.map((s) => s.id)).toEqual([
      "live_status",
      "group_agreement",
      "general_rules",
    ]);
    expect(ctx.systemPrompt.indexOf("Live group status")).toBeLessThan(
      ctx.systemPrompt.indexOf("group's agreement"),
    );
    expect(ctx.systemPrompt.indexOf("group's agreement")).toBeLessThan(
      ctx.systemPrompt.indexOf("General Susu rules"),
    );
  });

  it("flags stale agreement when live amount/pot/stalled disagree", () => {
    const ctx = buildChatContext({
      status: fixtureStalledLiveStatus,
      activeAgreement: fixtureStaleAgreement,
    });
    expect(ctx.agreementMayBeStale).toBe(true);
    expect(ctx.staleNotes.some((n) => n.includes("contribution amount"))).toBe(
      true,
    );
    expect(ctx.staleNotes.some((n) => n.includes("stalled"))).toBe(true);
    expect(ctx.staleNotes.some((n) => n.includes("payout is blocked"))).toBe(
      true,
    );
    expect(ctx.systemPrompt).toContain("Stale / conflict notes");
    expect(ctx.systemPrompt).toContain("live wins");
    expect(ctx.activeAgreementVersion).toBe(1);
  });

  it("prefers live facts in the live section even when agreement differs", () => {
    const ctx = buildChatContext({
      status: fixtureStalledLiveStatus,
      activeAgreement: fixtureStaleAgreement,
    });
    const live = ctx.sections.find((s) => s.id === "live_status");
    expect(live?.body).toContain("Contribution amount: 40");
    expect(live?.body).toContain("Stalled: yes");
    expect(live?.body).toContain("Mike");
    const agreement = ctx.sections.find((s) => s.id === "group_agreement");
    expect(agreement?.body).toContain("Contribution amount: 50");
  });

  it("works with null agreement", () => {
    const ctx = buildChatContext({
      status: fixtureHealthyLiveStatus,
      activeAgreement: null,
    });
    expect(ctx.agreementMayBeStale).toBe(false);
    expect(ctx.activeAgreementVersion).toBeNull();
    expect(ctx.sections[1]?.body).toContain("No active agreement");
  });

  it("works with null status", () => {
    const ctx = buildChatContext({
      status: null,
      activeAgreement: fixtureStaleAgreement,
    });
    expect(ctx.sections[0]?.body).toContain("No live group status");
    expect(ctx.sources.some((s) => s.kind === "general_rules")).toBe(true);
  });

  it("includes general FAQ by default", () => {
    const ctx = buildChatContext({
      status: null,
      activeAgreement: null,
    });
    expect(ctx.systemPrompt).toContain("What is a susu?");
    expect(generalRulesExcerpt()).toContain("simulation only");
  });
});
