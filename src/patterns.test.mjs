import { describe, it, expect } from "vitest";
import {
  patternsIn,
  patternKey,
  patternName,
  timesPerYear,
  cadence,
  categorise,
  colorOf,
} from "./patterns.mjs";
import { buildDefaults } from "./defaults.mjs";

const task = (title, rule) => ({ id: title, title, rule, startMin: 480, duration: 30 });

describe("pattern ordering", () => {
  it("ranks by how often a rule fires", () => {
    expect(timesPerYear({ kind: "everyday" })).toBeGreaterThan(timesPerYear({ kind: "weekday" }));
    expect(timesPerYear({ kind: "weekday" })).toBeGreaterThan(timesPerYear({ kind: "weekend" }));
    expect(timesPerYear({ kind: "weekend" })).toBeGreaterThan(timesPerYear({ kind: "dow", dow: 1 }));
    expect(timesPerYear({ kind: "dow", dow: 1 })).toBeGreaterThan(
      timesPerYear({ kind: "gc-monthday", day: 1 }),
    );
    expect(timesPerYear({ kind: "gc-monthday", day: 1 })).toBeGreaterThan(
      timesPerYear({ kind: "holiday" }),
    );
  });

  it("puts daily first and holidays last", () => {
    const ps = patternsIn([
      task("Vote", { kind: "holiday" }),
      task("Gym", { kind: "dow", dow: 1 }),
      task("Wake", { kind: "everyday" }),
      task("Commute", { kind: "weekday" }),
    ]);
    expect(ps.map((p) => p.name)).toEqual(["Daily", "Weekdays", "Monday", "Holidays"]);
  });
});

describe("patterns are observed, never authored", () => {
  it("omits any pattern no task uses", () => {
    const ps = patternsIn([task("Wake", { kind: "everyday" })]);
    expect(ps).toHaveLength(1);
    expect(ps.map((p) => p.id)).not.toContain("weekend");
    expect(ps.map((p) => p.id)).not.toContain("weekday");
  });

  it("is empty when nothing recurs", () => {
    expect(patternsIn([])).toEqual([]);
    expect(patternsIn([{ id: "x", title: "One-off", rule: null }])).toEqual([]);
  });

  it("gathers tasks sharing a recurrence into one pattern", () => {
    const ps = patternsIn([
      task("Wake", { kind: "everyday" }),
      task("Sleep", { kind: "everyday" }),
      task("Gym", { kind: "dow", dow: 3 }),
    ]);
    expect(ps).toHaveLength(2);
    expect(ps[0].tasks.map((t) => t.title)).toEqual(["Wake", "Sleep"]);
    expect(ps[1].name).toBe("Wednesday");
  });

  it("the five defaults produce exactly one pattern", () => {
    const ps = patternsIn(buildDefaults());
    expect(ps).toHaveLength(1);
    expect(ps[0].name).toBe("Daily");
    expect(ps[0].tasks).toHaveLength(5);
  });

  it("names an unfamiliar recurrence with a number", () => {
    const ps = patternsIn([task("Odd", { kind: "lunar", phase: 2 })]);
    expect(ps[0].name).toBe("Pattern 1");
  });

  it("keys the same recurrence identically and different ones apart", () => {
    expect(patternKey({ kind: "dow", dow: 2 })).toBe(patternKey({ kind: "dow", dow: 2 }));
    expect(patternKey({ kind: "dow", dow: 2 })).not.toBe(patternKey({ kind: "dow", dow: 3 }));
    expect(patternKey({ kind: "gc-monthday", day: 5 })).not.toBe(
      patternKey({ kind: "ec-monthday", day: 5 }),
    );
  });

  it("names the plain recurrences without the word 'every'", () => {
    expect(patternName({ kind: "everyday" })).toBe("Daily");
    expect(patternName({ kind: "weekend" })).toBe("Weekends");
    expect(patternName({ kind: "dow", dow: 5 })).toBe("Friday");
    for (const k of ["everyday", "weekday", "weekend", "holiday"]) {
      expect(patternName({ kind: k })).not.toMatch(/every/i);
    }
  });

  it("describes cadence in words", () => {
    expect(cadence({ kind: "everyday" })).toBe("365 times a year");
    expect(cadence({ kind: "dow", dow: 1 })).toBe("Once a week");
  });
});

describe("categories are authored", () => {
  const cats = [
    { id: "c1", name: "School", color: "blue" },
    { id: "c2", name: "Home", color: "green" },
  ];

  it("groups tasks under their category and leaves the rest loose", () => {
    const tasks = [
      { id: "a", title: "Studying", categoryId: "c1" },
      { id: "b", title: "Going to school", categoryId: "c1" },
      { id: "c", title: "Dishes", categoryId: "c2" },
      { id: "d", title: "Wander" },
    ];
    const { groups, loose } = categorise(tasks, cats);
    expect(groups[0].tasks.map((t) => t.title)).toEqual(["Studying", "Going to school"]);
    expect(groups[1].tasks.map((t) => t.title)).toEqual(["Dishes"]);
    expect(loose.map((t) => t.title)).toEqual(["Wander"]);
  });

  it("treats a task pointing at a deleted category as loose", () => {
    const { loose } = categorise([{ id: "a", title: "Orphan", categoryId: "gone" }], cats);
    expect(loose).toHaveLength(1);
  });

  it("a task can hold a category and a pattern at once", () => {
    const t = { id: "a", title: "Class", categoryId: "c1", rule: { kind: "weekday" } };
    expect(categorise([t], cats).groups[0].tasks).toHaveLength(1);
    expect(patternsIn([t])[0].name).toBe("Weekdays");
  });

  it("falls back to a real colour for an unknown id", () => {
    expect(colorOf("nope").id).toBe("green");
    expect(colorOf("violet").hue).toBe(268);
  });
});
