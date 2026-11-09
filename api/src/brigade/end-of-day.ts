/** Offset of a time zone from UTC at a given moment, in ms (positive east of Greenwich) */
function timeZoneOffsetMs(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')) - at.getTime();
}

/** 23:59:59 of the current day in the given time zone (e.g. Europe/Warsaw), as an absolute moment */
export function endOfDayInTimeZone(timeZone: string, now = new Date()): Date {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(now)
    .split('-')
    .map(Number);
  const wallClockAsUtc = Date.UTC(y, m - 1, d, 23, 59, 59);
  return new Date(wallClockAsUtc - timeZoneOffsetMs(timeZone, new Date(wallClockAsUtc)));
}
