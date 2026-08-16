import { describe, it, expect } from "vitest";
import { KIND, KINDS, kindOf, isSpread, progressOf, readProgress, paceTarget } from "./kinds.mjs";

describe("task kinds", () => {
  it("offers plain, tally, measure and checklist", () => {
    expect(KINDS.map((k) => k.id)).toEqual([KIND.PLAIN, KIND.TALLY, KIND.MEASURE, KIND.CHECKLIST]);
  });

  it("falls back to plain for anything unknown", () => {
    expect(kindOf("nope").id).toBe(KIND.PLAIN);
    expect(kindOf(undefined).id).toBe(KIND.PLAIN);
  });

  it("gives a tally a sensible default target and step", () => {
    const t = kindOf(KIND.TALLY);
    expect(t.unit).toBe("ml");
    expect(t.target).toBe(2500);
    expect(t.step).toBe(250);
  });
});

describe("progress", () => {
  const water = { kind: KIND.TALLY, target: 2500, unit: "ml" };

  it("is null for a plain task — undone is not zero", () => {
    expect(progressOf({ kind: KIND.PLAIN }, null)).toBeNull();
    expect(progressOf({}, null)).toBeNull();
  });

  it("reports a ratio against the target", () => {
    expect(progressOf(water, { amount: 1250 }).ratio).toBe(0.5);
    expect(progressOf(water, null).done).toBe(0);
  });

  it("never exceeds a full bar, even when you overshoot", () => {
    const p = progressOf(water, { amount: 4000 });
    expect(p.ratio).toBe(1);
    expect(p.done).toBe(4000); // but the honest number is kept
  });

  it("counts checklist items", () => {
    const gym = { kind: KIND.CHECKLIST, items: ["Squat", "Bench", "Row"] };
    expect(progressOf(gym, { checked: ["Squat"] })).toMatchObject({ done: 1, total: 3 });
    expect(progressOf({ kind: KIND.CHECKLIST, items: [] }, null)).toBeNull();
  });

  it("reads back the way a person would say it", () => {
    expect(readProgress(water, { amount: 1400 })).toBe("1400 / 2500 ml");
    expect(readProgress({ kind: KIND.CHECKLIST, items: [1, 2, 3, 4, 5] }, { checked: [1, 2, 3] }))
      .toBe("3 of 5");
    expect(readProgress({ kind: KIND.MEASURE, unit: "hr" }, { amount: 7 })).toBe("7 hr");
    expect(readProgress({ kind: KIND.PLAIN }, null)).toBeNull();
  });
});

describe("pace", () => {
  const water = { kind: KIND.TALLY, target: 2400 };

  it("expects nothing at dawn and everything by the end of the waking day", () => {
    expect(paceTarget(water, 0)).toBe(0);
    expect(paceTarget(water, 16 * 60)).toBe(2400);
  });

  it("scales through the day", () => {
    expect(paceTarget(water, 8 * 60)).toBe(1200);
  });

  it("does not keep climbing after the waking day is over", () => {
    expect(paceTarget(water, 20 * 60)).toBe(2400);
  });

  it("has no opinion about tasks that are not spread", () => {
    expect(paceTarget({ kind: KIND.PLAIN, target: 5 }, 100)).toBeNull();
    expect(isSpread(water)).toBe(true);
    expect(isSpread({ kind: KIND.MEASURE })).toBe(false);
  });
});
