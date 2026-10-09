/** Convert a local wall-clock date/time in an IANA timezone to a UTC Date. */
export function zonedDateTimeToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm, ss = 0] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm, ss);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(guess));
  const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT';
  const match = offsetPart.match(/^GMT([+-])(\d{2}):?(\d{2})?$/);
  const offsetMinutes = match
    ? (Number(match[2]) * 60 + Number(match[3] || 0)) * (match[1] === '-' ? -1 : 1)
    : 0;
  return new Date(guess - offsetMinutes * 60_000);
}

export function localDateDayOfWeek(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function utcRangeForLocalDate(date: string, timeZone: string) {
  return {
    start: zonedDateTimeToUtc(date, '00:00:00', timeZone),
    end: zonedDateTimeToUtc(addDays(date, 1), '00:00:00', timeZone),
  };
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Compatibility helpers used by the public booking API. */

export function businessDateTimeToUtc(
  date: string,
  time: string,
  timeZone: string,
): Date {
  return zonedDateTimeToUtc(date, time, timeZone);
}

export function formatDateInTimeZone(
  date: Date,
  timeZone: string,
): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("INVALID_TIME_ZONE_DATE");
  }

  return `${year}-${month}-${day}`;
}

export function businessDayOfWeek(date: string): number {
  return localDateDayOfWeek(date);
}

export function minutesFromTime(
  value: string | null | undefined,
): number {
  if (!value) return 0;

  const [hour, minute] = value.split(":").map(Number);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error("INVALID_TIME");
  }

  return hour * 60 + minute;
}
