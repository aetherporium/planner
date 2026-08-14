import { describe, it, expect, beforeEach } from "vitest";
import {
  STATUS, canCompleteAt, makeEntry, statusOf, timelineWithGaps, nowSlice,
  GAP_KINDS, parseTime, fmtTime, fmtDur, loggedLate, driftedFromPlan, __resetEntryIds, isMoment,
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

  it("everything else still occupies time", () => {
    for (const t of buildDefaults().filter((t) => t.key !== "wake")) {
      expect(isMoment(t)).toBe(false);
      expect(t.duration).toBeGreaterThan(0);
    }
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
