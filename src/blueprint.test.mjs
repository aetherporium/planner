import { describe, it, expect } from "vitest";
import { firesOn, blueprintFor, ruleFromFrequency, describeRule, conditionsMet } from "./blueprint.mjs";
import { dayFromGc, dayFromEc } from "./calendar.mjs";

const friday = dayFromGc(2026, 8, 14);
const saturday = dayFromGc(2026, 8, 15);
const newYear = dayFromEc(2018, 1, 1);

describe("blueprint rules", () => {
  it("everyday fires always", () => {
    expect(firesOn({ kind: "everyday" }, friday)).toBe(true);
    expect(firesOn({ kind: "everyday" }, saturday)).toBe(true);
  });
  it("weekday fires Mon-Fri only", () => {
    expect(firesOn({ kind: "weekday" }, friday)).toBe(true);
    expect(firesOn({ kind: "weekday" }, saturday)).toBe(false);
  });
  it("weekend fires Sat-Sun only", () => {
    expect(firesOn({ kind: "weekend" }, saturday)).toBe(true);
    expect(firesOn({ kind: "weekend" }, friday)).toBe(false);
  });
  it("every-Monday fires only on Mondays", () => {
    expect(firesOn({ kind: "dow", dow: 1 }, dayFromGc(2026, 8, 17))).toBe(true);
    expect(firesOn({ kind: "dow", dow: 1 }, friday)).toBe(false);
  });
  it("supports day-of-month in BOTH calendars", () => {
    expect(firesOn({ kind: "gc-monthday", day: 14 }, friday)).toBe(true);
    expect(firesOn({ kind: "ec-monthday", day: 8 }, friday)).toBe(true);
    expect(firesOn({ kind: "ec-monthday", day: 14 }, friday)).toBe(false);
  });
  it("fires on any holiday, or one named holiday", () => {
    expect(firesOn({ kind: "holiday" }, newYear)).toBe(true);
    expect(firesOn({ kind: "holiday" }, friday)).toBe(false);
    expect(firesOn({ kind: "holiday", name: "Enkutatash (New Year)" }, newYear)).toBe(true);
  });
  it("supports explicit custom dates", () => {
    expect(firesOn({ kind: "dates", dates: ["2026-08-14"] }, friday)).toBe(true);
  });
});

describe("blueprint assembly", () => {
  const tasks = [
    { id: "a", title: "Wake", rule: { kind: "everyday" }, startMin: 360 },
    { id: "b", title: "Standup", rule: { kind: "weekday" }, startMin: 540 },
    { id: "c", title: "Long ride", rule: { kind: "weekend" }, startMin: 480 },
    { id: "d", title: "One-off", rule: null, startMin: 600 },
  ];
  it("includes only rules that fire, in time order", () => {
    expect(blueprintFor(tasks, friday).map((t) => t.id)).toEqual(["a", "b"]);
    expect(blueprintFor(tasks, saturday).map((t) => t.id)).toEqual(["a", "c"]);
  });
  it("excludes tasks with no rule from the blueprint", () => {
    expect(blueprintFor(tasks, friday).some((t) => t.id === "d")).toBe(false);
  });
});

describe("frequency flows into the blueprint automatically", () => {
  it("daily becomes an everyday rule", () => {
    expect(ruleFromFrequency("daily", friday)).toEqual({ kind: "everyday" });
  });
  it("weekly becomes that day-of-week", () => {
    expect(ruleFromFrequency("weekly", friday)).toEqual({ kind: "dow", dow: 5 });
  });
  it("monthly becomes that Gregorian day-of-month", () => {
    expect(ruleFromFrequency("monthly", friday)).toEqual({ kind: "gc-monthday", day: 14 });
  });
  it("ec-monthly uses the Ethiopian day-of-month", () => {
    expect(ruleFromFrequency("ec-monthly", friday)).toEqual({ kind: "ec-monthday", day: 8 });
  });
  it("leaves one-off tasks out of the blueprint", () => {
    expect(ruleFromFrequency("once", friday)).toBeNull();
  });
});

describe("explanations", () => {
  it("phrases every rule kind in plain words", () => {
    expect(describeRule({ kind: "everyday" })).toBe("Every day");
    expect(describeRule({ kind: "dow", dow: 1 })).toBe("Every Monday");
    expect(describeRule({ kind: "ec-monthday", day: 1 })).toMatch(/Ethiopian/);
  });
  it("lists which conditions a day satisfies", () => {
    const met = conditionsMet(friday);
    expect(met).toContain("weekday");
    expect(met).toContain("dow:5");
    expect(met).not.toContain("weekend");
  });
});
