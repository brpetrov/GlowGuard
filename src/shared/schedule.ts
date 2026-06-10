import type { ScheduleSettings } from "../types/settings";

export type Period = "day" | "evening" | "night";

export function getCurrentPeriod(now: Date, schedule: ScheduleSettings): Period {
  const minutes = now.getHours() * 60 + now.getMinutes();

  const dayMin = parseTime(schedule.dayStart);
  const eveningMin = parseTime(schedule.eveningStart);
  const nightMin = parseTime(schedule.nightStart);

  if (nightMin > eveningMin) {
    if (minutes >= nightMin || minutes < dayMin) return "night";
    if (minutes >= eveningMin) return "evening";
    return "day";
  }

  if (minutes >= nightMin && minutes < dayMin) return "night";
  if (minutes >= eveningMin && minutes < nightMin) return "evening";
  return "day";
}

function parseTime(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function getAutomaticLevels(now: Date, schedule: ScheduleSettings): {
  dimLevel: number;
  warmthLevel: number;
  period: Period;
} {
  const period = getCurrentPeriod(now, schedule);
  const periodSettings = schedule[period];
  return {
    dimLevel: periodSettings.dimLevel,
    warmthLevel: periodSettings.warmthLevel,
    period,
  };
}

export function getNextPeriodChange(now: Date, schedule: ScheduleSettings): Date {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const boundaries = [
    parseTime(schedule.dayStart),
    parseTime(schedule.eveningStart),
    parseTime(schedule.nightStart),
  ].sort((a, b) => a - b);

  let nextMin = boundaries.find((b) => b > minutes);
  const tomorrow = nextMin === undefined;
  if (tomorrow) nextMin = boundaries[0];

  const next = new Date(now);
  next.setHours(Math.floor(nextMin! / 60), nextMin! % 60, 0, 0);
  if (tomorrow) next.setDate(next.getDate() + 1);

  return next;
}
