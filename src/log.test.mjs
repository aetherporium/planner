import { describe, it, expect, beforeEach } from "vitest";
import {
  STATUS, canCompleteAt, makeEntry, statusOf, timelineWithGaps, nowSlice,
  GAP_KINDS, parseTime, fmtTime, fmtDur, loggedLate, driftedFromPlan, __resetEntryIds,
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
