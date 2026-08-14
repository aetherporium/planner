import { describe, it, expect } from "vitest";
import {
  dayFromEc, dayFromGc, jdnToEc, ecToJdn, isEcLeapYear,
  ecMonthLength, ecMonthDays, addDays,
} from "./calendar.mjs";

describe("Ethiopian calendar", () => {
  it("puts Enkutatash 2018 EC on 11 Sep 2025", () => {
    expect(dayFromEc(2018, 1, 1).iso).toBe("2025-09-11");
  });
  it("shifts the new year to 12 Sep in the year after a leap year", () => {
    expect(dayFromEc(2016, 1, 1).iso).toBe("2023-09-12");
  });
  it("treats years where y%4===3 as leap", () => {
    expect(isEcLeapYear(2015)).toBe(true);
    expect(isEcLeapYear(2016)).toBe(false);
  });
  it("gives Pagume 6 days in a leap year and 5 otherwise", () => {
    expect(ecMonthLength(2015, 13)).toBe(6);
    expect(ecMonthLength(2016, 13)).toBe(5);
  });
  it("gives every other month 30 days", () => {
    for (let m = 1; m <= 12; m++) expect(ecMonthLength(2018, m)).toBe(30);
  });
  it("places Genna on 7 Jan", () => {
    expect(dayFromEc(2018, 4, 29).iso).toBe("2026-01-07");
  });
  it("round-trips EC <-> JDN across a wide range", () => {
    for (let j = 2400000; j < 2500000; j += 97) {
      const e = jdnToEc(j);
      expect(ecToJdn(e.y, e.m, e.d)).toBe(j);
    }
  });
  it("renders a full Ethiopian month grid", () => {
    expect(ecMonthDays(2018, 1)).toHaveLength(30);
    expect(ecMonthDays(2015, 13)).toHaveLength(6);
  });
});

describe("dual view", () => {
  it("carries both calendars on one day", () => {
    const d = dayFromGc(2026, 8, 14);
    expect(d.ec).toEqual({ y: 2018, m: 12, d: 8 });
    expect(d.ecMonthName).toBe("Nehase");
    expect(d.dowName).toBe("Friday");
  });
  it("detects weekends", () => {
    expect(dayFromGc(2026, 8, 15).isWeekend).toBe(true);
    expect(dayFromGc(2026, 8, 14).isWeekend).toBe(false);
  });
  it("surfaces holidays from both systems", () => {
    expect(dayFromEc(2018, 1, 1).holidays).toContain("Enkutatash (New Year)");
    expect(dayFromGc(2026, 12, 25).holidays).toContain("Christmas Day");
  });
  it("accepts supplied movable feasts", () => {
    const d = dayFromGc(2026, 3, 20, { "2026-03-20": ["Eid al-Fitr"] });
    expect(d.holidays).toContain("Eid al-Fitr");
  });
  it("walks days across a month boundary", () => {
    expect(addDays(dayFromEc(2018, 1, 30), 1).ec).toEqual({ y: 2018, m: 2, d: 1 });
  });
  it("walks from Pagume into the new year", () => {
    expect(addDays(dayFromEc(2015, 13, 6), 1).ec).toEqual({ y: 2016, m: 1, d: 1 });
  });
});
