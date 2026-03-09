import { describe, expect, it } from "vitest";
import { getNextCronDate } from "#utils/cron.util.js";

describe("getNextCronDate", () => {
  // Use a fixed local time as anchor: June 15, 2025 10:30 local time (a Sunday)
  const after = new Date(2025, 5, 15, 10, 30, 0, 0); // months are 0-indexed

  it("returns the next minute for * * * * *", () => {
    const result = getNextCronDate("* * * * *", after);
    expect(result).toEqual(new Date(2025, 5, 15, 10, 31, 0, 0));
  });

  it("returns the next top-of-hour for 0 * * * *", () => {
    const result = getNextCronDate("0 * * * *", after);
    expect(result).toEqual(new Date(2025, 5, 15, 11, 0, 0, 0));
  });

  it("returns the next occurrence for a specific time", () => {
    const result = getNextCronDate("30 9 * * *", after);
    // 09:30 local has already passed today, so next day
    expect(result).toEqual(new Date(2025, 5, 16, 9, 30, 0, 0));
  });

  it("returns a same-day match if not yet passed", () => {
    const early = new Date(2025, 5, 15, 8, 0, 0, 0);
    const result = getNextCronDate("30 9 * * *", early);
    expect(result).toEqual(new Date(2025, 5, 15, 9, 30, 0, 0));
  });

  it("handles month and day-of-month", () => {
    const result = getNextCronDate("0 0 1 1 *", after);
    // Next Jan 1 midnight local
    expect(result).toEqual(new Date(2026, 0, 1, 0, 0, 0, 0));
  });

  it("handles day-of-week", () => {
    // after is a Sunday, find next Monday (1)
    const result = getNextCronDate("0 0 * * 1", after);
    expect(result).toEqual(new Date(2025, 5, 16, 0, 0, 0, 0));
  });

  it("handles ranges in day-of-week (weekdays)", () => {
    const result = getNextCronDate("0 0 * * 1-5", after);
    expect(result).toEqual(new Date(2025, 5, 16, 0, 0, 0, 0));
  });

  it("handles step values", () => {
    const result = getNextCronDate("0 */6 * * *", after);
    // */6 matches 0, 6, 12, 18. Next after 10:30 local is 12:00
    expect(result).toEqual(new Date(2025, 5, 15, 12, 0, 0, 0));
  });

  it("handles lists", () => {
    const result = getNextCronDate("0 0 1,15 * *", after);
    // June 15 midnight local has passed, next is July 1
    expect(result).toEqual(new Date(2025, 6, 1, 0, 0, 0, 0));
  });

  it("always returns a time strictly after the input", () => {
    const result = getNextCronDate("30 10 * * *", after);
    expect(result.getTime()).toBeGreaterThan(after.getTime());
  });

  it("throws on invalid expression with wrong field count", () => {
    expect(() => getNextCronDate("* * *", after)).toThrow(
      "expected 5 fields, got 3"
    );
  });
});
