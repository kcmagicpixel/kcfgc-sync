/**
 * Parses a single cron field into the set of matching integer values.
 *
 * @param field A cron field expression, e.g. "*", "1-5", "1,3,5"
 * @param min The minimum allowed value for this field
 * @param max The maximum allowed value for this field
 * @returns The set of integer values matched by the expression
 */
function parseField(field: string, min: number, max: number): Set<number> {
  const values = new Set<number>();
  for (const part of field.split(",")) {
    const stepMatch = part.match(/^(.+)\/(\d+)$/);
    const step = stepMatch ? Number(stepMatch[2]) : 1;
    const range = stepMatch ? stepMatch[1] : part;

    let start: number;
    let end: number;

    if (range === "*") {
      start = min;
      end = max;
    } else if (range.includes("-")) {
      const [lo, hi] = range.split("-").map(Number);
      start = lo;
      end = hi;
    } else {
      start = Number(range);
      end = Number(range);
    }

    for (let i = start; i <= end; i += step) {
      values.add(i);
    }
  }
  return values;
}

/**
 * Computes the next date matching a standard 5-field crontab expression.
 *
 * Fields: minute (0-59), hour (0-23), day-of-month (1-31), month (1-12), day-of-week (0-6, 0=Sunday).
 * Supports numeric values, ranges (1-5), steps, and lists (1,3,5).
 *
 * @param expression A 5-field crontab expression
 * @param after The date to start searching from (defaults to now)
 * @returns The next matching Date
 * @throws If no match is found within 4 years
 */
export function getNextCronDate(
  expression: string,
  after: Date = new Date()
): Date {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(
      `Invalid cron expression: expected 5 fields, got ${parts.length}`
    );
  }

  const minutes = parseField(parts[0], 0, 59);
  const hours = parseField(parts[1], 0, 23);
  const daysOfMonth = parseField(parts[2], 1, 31);
  const months = parseField(parts[3], 1, 12);
  const daysOfWeek = parseField(parts[4], 0, 6);

  const candidate = new Date(after);
  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1);

  // Search up to 4 years ahead to handle all cron patterns
  const limit = new Date(after);
  limit.setFullYear(limit.getFullYear() + 4);

  while (candidate < limit) {
    if (!months.has(candidate.getMonth() + 1)) {
      candidate.setMonth(candidate.getMonth() + 1, 1);
      candidate.setHours(0, 0, 0, 0);
      continue;
    }

    if (
      !daysOfMonth.has(candidate.getDate()) ||
      !daysOfWeek.has(candidate.getDay())
    ) {
      candidate.setDate(candidate.getDate() + 1);
      candidate.setHours(0, 0, 0, 0);
      continue;
    }

    if (!hours.has(candidate.getHours())) {
      candidate.setHours(candidate.getHours() + 1, 0, 0, 0);
      continue;
    }

    if (!minutes.has(candidate.getMinutes())) {
      candidate.setMinutes(candidate.getMinutes() + 1, 0, 0);
      continue;
    }

    return candidate;
  }

  throw new Error(
    `No matching cron date found within 4 years for: ${expression}`
  );
}
