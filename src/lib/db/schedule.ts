import { type Schedule } from "./types";

const SCHEDULE_DAYS: Record<Exclude<Schedule, "monthly">, number> = {
  weekly: 7,
  biweekly: 14,
};

/** The next scheduled payment date: one schedule interval from `from`. */
export function nextDueDate(schedule: Schedule, from: Date = new Date()): Date {
  const due = new Date(from);
  if (schedule === "monthly") {
    due.setMonth(due.getMonth() + 1);
  } else {
    due.setDate(due.getDate() + SCHEDULE_DAYS[schedule]);
  }
  return due;
}
