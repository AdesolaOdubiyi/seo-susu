import { describe, expect, it } from "vitest";
import {
  buildTemplateReminders,
  daysUntilDue,
  duePhrase,
  lateMembers,
  templateReminder,
} from "./reminders";
import {
  fixtureHealthyLiveStatus,
  fixtureStalledLiveStatus,
} from "./fixtures/demo-group";
import type { LiveGroupStatus } from "./types";

describe("lateMembers", () => {
  it("returns active members who haven't contributed this round", () => {
    const late = lateMembers(fixtureStalledLiveStatus);
    expect(late.map((m) => m.name)).toEqual(["Mike"]);
  });

  it("is empty when everyone active has contributed", () => {
    expect(lateMembers(fixtureHealthyLiveStatus)).toHaveLength(0);
  });

  it("skips inactive members even if they haven't contributed", () => {
    const status: LiveGroupStatus = {
      ...fixtureStalledLiveStatus,
      members: fixtureStalledLiveStatus.members.map((m) =>
        m.name === "Mike" ? { ...m, active: false } : m,
      ),
    };
    expect(lateMembers(status)).toHaveLength(0);
  });
});

describe("daysUntilDue / duePhrase", () => {
  it("counts whole days to the due date", () => {
    const now = new Date("2026-07-20T12:00:00.000Z");
    expect(daysUntilDue("2026-07-22T12:00:00.000Z", now)).toBe(2);
    expect(daysUntilDue("2026-07-20T12:00:00.000Z", now)).toBe(0);
    expect(daysUntilDue("2026-07-18T12:00:00.000Z", now)).toBe(-2);
  });

  it("phrases upcoming, today, tomorrow, and overdue", () => {
    expect(duePhrase(3, false)).toBe("is due in 3 days");
    expect(duePhrase(1, false)).toBe("is due tomorrow");
    expect(duePhrase(0, false)).toBe("is due today");
    expect(duePhrase(-2, false)).toBe("was due 2 days ago");
  });

  it("treats a stalled round as overdue regardless of the day count", () => {
    expect(duePhrase(1, true)).toContain("overdue");
  });
});

describe("templateReminder", () => {
  it("names the member, amount, and group without jargon", () => {
    const msg = templateReminder({
      name: "Mike",
      groupName: "Friday Circle",
      amount: 40,
      days: 2,
      stalled: false,
    });
    expect(msg).toContain("Mike");
    expect(msg).toContain("$40");
    expect(msg).toContain("Friday Circle");
    expect(msg).toContain("is due in 2 days");
    expect(msg.toLowerCase()).toContain("simulated");
  });
});

describe("buildTemplateReminders", () => {
  it("builds one grounded reminder per late member on a live, stalled round", () => {
    const reminders = buildTemplateReminders(fixtureStalledLiveStatus);
    expect(reminders).toHaveLength(1);
    expect(reminders[0].userId).toBe(3);
    expect(reminders[0].message).toContain("Mike");
    expect(reminders[0].message).toContain("$40");
    expect(reminders[0].message).toContain("was due");
  });

  it("returns nothing when the group is not live yet", () => {
    const setupStatus: LiveGroupStatus = {
      ...fixtureStalledLiveStatus,
      phase: "setup",
    };
    expect(buildTemplateReminders(setupStatus)).toHaveLength(0);
  });

  it("returns nothing when every active member has paid", () => {
    expect(buildTemplateReminders(fixtureHealthyLiveStatus)).toHaveLength(0);
  });
});
