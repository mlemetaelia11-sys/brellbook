export function getTimeZoneParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

export function formatDateInTimeZone(date: Date, timeZone: string) {
  const p = getTimeZoneParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function businessDayOfWeek(date: string) {
  return new Date(`${date}T12:00:00.000Z`).getUTCDay();
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const p = getTimeZoneParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - date.getTime();
}

export function businessDateTimeToUtc(date: string, time: string, timeZone: string) {
  const guess = new Date(`${date}T${time}:00.000Z`);
  if (Number.isNaN(guess.getTime())) throw new Error('INVALID_DATE_TIME');
  const firstOffset = timeZoneOffsetMs(guess, timeZone);
  const first = new Date(guess.getTime() - firstOffset);
  const secondOffset = timeZoneOffsetMs(first, timeZone);
  return new Date(guess.getTime() - secondOffset);
}

export function nextBusinessDate(date: string) {
  const d = new Date(`${date}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function minutesFromTime(value: string | null | undefined) {
  if (!value) return 0;
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}
