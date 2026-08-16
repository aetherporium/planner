import { describe, it, expect, beforeEach } from "vitest";
import {
  STATUS, canCompleteAt, makeEntry, statusOf, timelineWithGaps, nowSlice,
  GAP_KINDS, parseTime, fmtTime, fmtDur, loggedLate, driftedFromPlan, __resetEntryIds,
  isMoment, isSpreadTask, conflictsFor, nextFreeSlot,
} from "./log.mjs";
import { dayFromGc } from "./calendar.mjs";
import { buildDefaults, DEFAULT_TASKS } from "./defaults.mjs";

const today = dayFromGc(2026, 8, 14);
const now = { jdn: today.jdn, minutes: 14 * 60 };
beforeEach(() => __resetEntryIds());

describe("honesty — you cannot have done the future", () => {
  it("rejects a future day", () => {
    expect(canCompleteAt({ dayJdn: today.jdn + 1, actualMin: 540 }, now).ok).toBe(false);
  });
  it("rejects later today", () => {
    const r = canCompleteAt({ dayJdn: today.jdn, actualMin: 20 * 60 }, now);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("14:00");
  });
  it("allows earlier today and the exact current minute", () => {
    expect(canCompleteAt({ dayJdn: today.jdn, actualMin: 540 }, now).ok).toBe(true);
    expect(canCompleteAt({ dayJdn: today.jdn, actualMin: now.minutes }, now).ok).toBe(true);
  });
  it("allows any past day", () => {
    expect(canCompleteAt({ dayJdn: today.jdn - 3, actualMin: 1400 }, now).ok).toBe(true);
  });
});

describe("three kinds of time", () => {
  it("keeps planned, actual and log times separately", () => {
    const e = makeEntry({
      taskId: "t1", dayJdn: today.jdn, status: STATUS.DONE,
      plannedMin: 19 * 60 + 30, actualMin: 19 * 60,
    }, { jdn: today.jdn, minutes: 23 * 60 });
    expect(e.plannedMin).toBe(1170);
    expect(e.actualMin).toBe(1140);
    expect(e.loggedAtMin).toBe(1380);
  });
  it("detects drift between planned and actual", () => {
    const drift = makeEntry({ taskId: "a", dayJdn: 1, status: STATUS.DONE, plannedMin: 600, actualMin: 660 }, now);
    const onTime = makeEntry({ taskId: "b", dayJdn: 1, status: STATUS.DONE, plannedMin: 600, actualMin: 600 }, now);
    expect(driftedFromPlan(drift)).toBe(true);
    expect(driftedFromPlan(onTime)).toBe(false);
  });
  it("detects an entry logged on a later day", () => {
    const late = makeEntry({ taskId: "a", dayJdn: today.jdn - 1, status: STATUS.DONE }, now);
    expect(loggedLate(late)).toBe(true);
  });
});

describe("blank is not failure", () => {
  it("returns nothing at all when no entry exists", () => {
    expect(statusOf([], "a", today.jdn)).toBeNull();
  });
  it("keeps skipped distinct from blank", () => {
    const entries = [makeEntry({ taskId: "a", dayJdn: today.jdn, status: STATUS.SKIPPED }, now)];
    expect(statusOf(entries, "a", today.jdn).status).toBe(STATUS.SKIPPED);
    expect(statusOf(entries, "b", today.jdn)).toBeNull();
  });
  it("lets the latest entry win so users can change their mind", () => {
    const entries = [
      makeEntry({ taskId: "a", dayJdn: today.jdn, status: STATUS.SKIPPED }, now),
      makeEntry({ taskId: "a", dayJdn: today.jdn, status: STATUS.DONE }, now),
    ];
    expect(statusOf(entries, "a", today.jdn).status).toBe(STATUS.DONE);
  });
  it("rejects an invented status", () => {
    expect(() => makeEntry({ taskId: "a", dayJdn: 1, status: "failed" }, now)).toThrow();
  });
});

describe("default tasks", () => {
  it("always includes sleep, wake and eating", () => {
    const keys = DEFAULT_TASKS.map((t) => t.key);
    expect(keys).toContain("wake");
    expect(keys).toContain("sleep");
    expect(keys).toContain("breakfast");
    expect(keys).toContain("lunch");
    expect(keys).toContain("dinner");
  });
  it("keeps every default atomic — one activity per task", () => {
    for (const t of DEFAULT_TASKS) {
      expect(t.title).not.toMatch(/[&+]| and /i);
      expect(t.titleAm).not.toMatch(/[&+]| and /i);
    }
  });
  it("enables all defaults out of the box", () => {
    expect(buildDefaults().every((t) => t.enabled)).toBe(true);
  });
  it("lets the user explicitly disable one without deleting it", () => {
    const built = buildDefaults(new Set(["breakfast"]));
    const b = built.find((t) => t.key === "breakfast");
    expect(b.enabled).toBe(false);
    expect(built).toHaveLength(DEFAULT_TASKS.length);
  });
});

describe("gaps", () => {
  it("treats unclaimed time as rest", () => {
    const line = timelineWithGaps(
      [{ id: "a", startMin: 480, duration: 60 }, { id: "b", startMin: 600, duration: 60 }],
      { dayStartMin: 480, dayEndMin: 720 });
    expect(line.find((s) => s.kind === "gap").gapKind).toBe(GAP_KINDS.REST);
  });
  it("infers travel when the place changes", () => {
    const line = timelineWithGaps(
      [{ id: "a", startMin: 480, duration: 60, place: "ቤት" },
       { id: "b", startMin: 600, duration: 30, place: "ሱቅ" }],
      { dayStartMin: 480, dayEndMin: 660 });
    const t = line.find((s) => s.gapKind === GAP_KINDS.TRAVEL);
    expect(t.from).toBe("ቤት");
    expect(t.to).toBe("ሱቅ");
  });
  it("surfaces overlaps instead of hiding them", () => {
    const line = timelineWithGaps(
      [{ id: "a", startMin: 480, duration: 120 }, { id: "b", startMin: 540, duration: 60 }],
      { dayStartMin: 480, dayEndMin: 720 });
    expect(line.some((s) => s.kind === "overlap")).toBe(true);
  });
});

describe("now slice", () => {
  const tasks = [
    { id: "1", startMin: 480, duration: 30 }, { id: "2", startMin: 540, duration: 30 },
    { id: "3", startMin: 830, duration: 60 }, { id: "4", startMin: 960, duration: 30 },
    { id: "5", startMin: 1020, duration: 30 }, { id: "6", startMin: 1080, duration: 30 },
  ];
  it("finds the current task", () => expect(nowSlice(tasks, 840).current.id).toBe("3"));
  it("shows recent past", () => expect(nowSlice(tasks, 840).past.map(t => t.id)).toEqual(["1", "2"]));
  it("shows the next few", () => expect(nowSlice(tasks, 840).upcoming.map(t => t.id)).toEqual(["4", "5", "6"]));
  it("returns null in a gap", () => expect(nowSlice(tasks, 720).current).toBeNull());
});

describe("formatting", () => {
  it("formats times and durations", () => {
    expect(fmtTime(585)).toBe("09:45");
    expect(fmtTime(null)).toBe("—");
    expect(fmtDur(45)).toBe("45 min");
    expect(fmtDur(120)).toBe("2 hr");
  });
  it("parses and rejects times", () => {
    expect(parseTime("09:45")).toBe(585);
    expect(parseTime("25:00")).toBeNull();
  });
});

describe("moments — tasks with no duration", () => {
  it("wake is a moment, because waking takes no time", () => {
    const wake = buildDefaults().find((t) => t.key === "wake");
    expect(wake.duration).toBe(0);
    expect(isMoment(wake)).toBe(true);
  });

  it("everything with a place on the clock still occupies time", () => {
    const onTheClock = buildDefaults().filter((t) => t.key !== "wake" && t.kind !== "tally");
    for (const t of onTheClock) {
      expect(isMoment(t)).toBe(false);
      expect(t.duration).toBeGreaterThan(0);
    }
  });

  it("a spread task has no duration but is not a moment", () => {
    const water = buildDefaults().find((t) => t.key === "water");
    expect(water.duration).toBe(0);
    // Same zero, opposite reason: it is everywhere, not at an instant.
    expect(isMoment(water)).toBe(false);
    expect(isSpreadTask(water)).toBe(true);
  });

  it("keeps spread tasks off the ruler entirely", () => {
    const tl = timelineWithGaps(
      [
        { id: "w", title: "Water", startMin: 0, duration: 0, kind: "tally" },
        { id: "b", title: "Breakfast", startMin: 60, duration: 30 },
      ],
      { dayStartMin: 0, dayEndMin: 1440 },
    );
    expect(tl.some((i) => i.task?.id === "w")).toBe(false);
  });

  it("is emitted as its own kind, with zero width", () => {
    const tl = timelineWithGaps(
      [
        { id: "w", title: "Wake", startMin: 0, duration: 0 },
        { id: "b", title: "Breakfast", startMin: 60, duration: 30 },
      ],
      { dayStartMin: 0, dayEndMin: 1440 },
    );
    const moment = tl.find((i) => i.kind === "moment");
    expect(moment.task.title).toBe("Wake");
    expect(moment.startMin).toBe(moment.endMin);
  });

  it("does not consume time or open a gap behind itself", () => {
    const tl = timelineWithGaps(
      [
        { id: "w", title: "Wake", startMin: 0, duration: 0 },
        { id: "b", title: "Breakfast", startMin: 60, duration: 30 },
      ],
      { dayStartMin: 0, dayEndMin: 1440 },
    );
    // One rest gap 0->60, not two, and it starts at the very beginning.
    const gaps = tl.filter((i) => i.kind === "gap");
    expect(gaps[0].startMin).toBe(0);
    expect(gaps[0].endMin).toBe(60);
  });

  it("does not create a false travel gap", () => {
    const tl = timelineWithGaps(
      [
        { id: "a", title: "Home thing", startMin: 0, duration: 60, place: "Home" },
        { id: "w", title: "Alarm", startMin: 70, duration: 0, place: "Elsewhere" },
        { id: "b", title: "Shop", startMin: 120, duration: 30, place: "Market" },
      ],
      { dayStartMin: 0, dayEndMin: 1440 },
    );
    const travel = tl.find((i) => i.gapKind === GAP_KINDS.TRAVEL);
    // Travel is measured between real places, ignoring the moment.
    expect(travel.from).toBe("Home");
    expect(travel.to).toBe("Market");
  });

  it("counts as current only on its exact minute", () => {
    const tasks = [{ id: "w", title: "Wake", startMin: 360, duration: 0 }];
    expect(nowSlice(tasks, 360).current?.id).toBe("w");
    expect(nowSlice(tasks, 361).current).toBeNull();
    expect(nowSlice(tasks, 361).past.map((t) => t.id)).toEqual(["w"]);
  });
});

describe("scheduling conflicts", () => {
  const day = [
    { id: "a", title: "Maths", startMin: 120, duration: 90, place: "School" },
    { id: "b", title: "Lunch", startMin: 360, duration: 45, place: "Home" },
    { id: "w", title: "Wake", startMin: 0, duration: 0 },
    { id: "h", title: "Water", startMin: 0, duration: 0, kind: "tally" },
  ];

  it("finds nothing when the slot is free", () => {
    expect(conflictsFor({ startMin: 600, duration: 30 }, day)).toEqual([]);
  });

  it("names what is in the way, and for how long", () => {
    const c = conflictsFor({ startMin: 150, duration: 60 }, day);
    expect(c).toHaveLength(1);
    expect(c[0].kind).toBe("overlap");
    expect(c[0].task.title).toBe("Maths");
    expect(c[0].minutes).toBe(60); // 150–210 against 120–210
  });

  it("reports the worst clash first", () => {
    const c = conflictsFor({ startMin: 180, duration: 240 }, day);
    expect(c[0].minutes).toBeGreaterThanOrEqual(c[1].minutes);
  });

  it("does not treat a moment as a clash — an instant fits anywhere", () => {
    expect(conflictsFor({ startMin: 0, duration: 60 }, day)).toEqual([]);
  });

  it("ignores spread tasks, which are not on the ruler", () => {
    const c = conflictsFor({ startMin: 0, duration: 30 }, day);
    expect(c.some((x) => x.task.id === "h")).toBe(false);
  });

  it("flags no time to travel between different places", () => {
    const c = conflictsFor({ startMin: 215, duration: 30, place: "Office" }, day);
    expect(c[0].kind).toBe("tight");
    expect(c[0].from).toBe("School");
    expect(c[0].to).toBe("Office");
    expect(c[0].minutes).toBe(5);
  });

  it("says nothing about travel within the same place", () => {
    expect(conflictsFor({ startMin: 215, duration: 30, place: "School" }, day)).toEqual([]);
  });

  it("can ignore the task being edited", () => {
    expect(conflictsFor({ startMin: 120, duration: 90, ignoreId: "a" }, day)).toEqual([]);
  });

  it("suggests the nearest slot that actually fits", () => {
    // 150 clashes with Maths (120–210); the nearest fit is right after it.
    expect(nextFreeSlot({ startMin: 150, duration: 60 }, day)).toBe(210);
  });

  it("will look backwards if that is closer", () => {
    const packed = [{ id: "x", startMin: 60, duration: 600 }];
    expect(nextFreeSlot({ startMin: 100, duration: 30 }, packed)).toBe(30);
  });
});
