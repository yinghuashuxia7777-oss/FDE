const RFC3339_TIMESTAMP =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|([+-])(\d{2}):(\d{2}))$/;

export class TimestampInvariantError extends Error {
  override readonly name = 'TimestampInvariantError';
}

interface ParsedTimestamp {
  epochSecond: number;
  fractionDigits: string;
  canonical: string;
  secondIndexPrefix: string;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function isValidCalendarTime(match: RegExpExecArray): boolean {
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetHour = match[10] === undefined ? 0 : Number(match[10]);
  const offsetMinute = match[11] === undefined ? 0 : Number(match[11]);
  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  return (
    Number.isInteger(year) &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= (daysInMonth[month - 1] ?? 0) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59 &&
    second >= 0 &&
    second <= 59 &&
    offsetHour >= 0 &&
    offsetHour <= 23 &&
    offsetMinute >= 0 &&
    offsetMinute <= 59
  );
}

function canonicalFraction(rawFraction: string | undefined): string {
  const significant = (rawFraction ?? '').replace(/0+$/, '');
  return significant.length === 0
    ? '000'
    : significant.length < 3
      ? significant.padEnd(3, '0')
      : significant;
}

function parseRfc3339Timestamp(value: unknown, label: string): ParsedTimestamp {
  if (typeof value !== 'string') {
    throw new TimestampInvariantError(`${label} must be a valid timestamp.`);
  }
  const match = RFC3339_TIMESTAMP.exec(value);
  if (match === null || !isValidCalendarTime(match)) {
    throw new TimestampInvariantError(
      `${label} must be a valid RFC3339 timestamp.`,
    );
  }

  const local = new Date(0);
  local.setUTCFullYear(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  local.setUTCHours(Number(match[4]), Number(match[5]), Number(match[6]), 0);
  const offsetDirection = match[9] === '-' ? -1 : 1;
  const offsetMinutes =
    match[8] === 'Z'
      ? 0
      : offsetDirection * (Number(match[10]) * 60 + Number(match[11]));
  const utcMilliseconds = local.getTime() - offsetMinutes * 60_000;
  if (!Number.isFinite(utcMilliseconds)) {
    throw new TimestampInvariantError(`${label} must be a valid timestamp.`);
  }
  const epochSecond = utcMilliseconds / 1_000;
  const wholeSecondIso = new Date(utcMilliseconds).toISOString().slice(0, -5);
  if (!/^\d{4}-/.test(wholeSecondIso)) {
    throw new TimestampInvariantError(
      `${label} must remain within the four-digit RFC3339 UTC year range.`,
    );
  }
  const fractionDigits = canonicalFraction(match[7]);
  return {
    epochSecond,
    fractionDigits,
    canonical: `${wholeSecondIso}.${fractionDigits}Z`,
    secondIndexPrefix: `${wholeSecondIso}.`,
  };
}

export function normalizeRfc3339Timestamp(
  value: unknown,
  label: string,
): string {
  return parseRfc3339Timestamp(value, label).canonical;
}

export function compareRfc3339Timestamps(
  left: unknown,
  right: unknown,
): number {
  const parsedLeft = parseRfc3339Timestamp(left, 'left timestamp');
  const parsedRight = parseRfc3339Timestamp(right, 'right timestamp');
  if (parsedLeft.epochSecond !== parsedRight.epochSecond) {
    return parsedLeft.epochSecond < parsedRight.epochSecond ? -1 : 1;
  }
  const length = Math.max(
    parsedLeft.fractionDigits.length,
    parsedRight.fractionDigits.length,
  );
  const leftFraction = parsedLeft.fractionDigits.padEnd(length, '0');
  const rightFraction = parsedRight.fractionDigits.padEnd(length, '0');
  return leftFraction === rightFraction
    ? 0
    : leftFraction < rightFraction
      ? -1
      : 1;
}

export function rfc3339SecondIndexPrefix(
  value: unknown,
  label: string,
): string {
  return parseRfc3339Timestamp(value, label).secondIndexPrefix;
}
