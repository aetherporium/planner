import { describe, it, expect } from "vitest";
import {
  STATUS, canCompleteAt, makeEntry, statusOf, summarise,
  timelineWithGaps, nowSlice, GAP_KINDS, parseTime, fmtTime,
} from "./log.mjs";
import { dayFromGc } from "./calendar.mjs";

const today = dayFromGc(2026, 8, 14);
const now = { jdn: today.jdn, minutes: 14 * 60 }; // 14:00

describe("honesty rule — you cannot have done the future", () => {
  it("rejects completing a task on a future day", () => {
    const r = canCompleteAt({ dayJdn: today.jdn + 1, atMin: 9 * 60 }, now);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/hasn't happened/);
  });
  it("rejects completing later today", () => {
    const r = canCompleteAt({ dayJdn: today.jdn, atMin: 20 * 60 }, now);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/only 14:00/);
  });
  it("allows completing earlier today", () => {
    expect(canCompleteAt({ dayJdn: today.jdn, atMin: 9 * 60 }, now).ok).toBe(true);
  });
  it("allows completing the exact current minute", () => {
    expect(canCompleteAt({ dayJdn: today.jdn, atMin: now.minutes }, now).ok).toBe(true);
  });
  it("allows completing a past day", () => {
    expect(canCompleteAt({ dayJdn: today.jdn - 3, atMin: 23 * 60 }, now).ok).toBe(true);
  });
});

describe("blank is not failure", () => {
  const tasks = [
    { id: "a", duration: 30 }, { id: "b", duration: 30 }, { id: "c", duration: 30 },
  ];
  it("defaults every occurrence to unknown, never skipped", () => {
    const s = summarise(tasks, [], today.jdn);
    expect(s.unknown).toBe(3);
    expect(s.skipped).toBe(0);
    expect(s.done).toBe(0);
  });
  it("reports no adherence at all when nothing was answered", () => {
    expect(summarise(tasks, [], today.jdn).adherence).toBeNull();
  });
  it("counts adherence only over answered occurrences", () => {
    const entries = [makeEntry({ taskId: "a", dayJdn: today.jdn, status: STATUS.DONE })];
    const s = summarise(tasks, entries, today.jdn);
    expect(s.unknown).toBe(2);
    expect(s.adherence).toBe(1); // 1 done of 1 answered — the 2 blanks don't count against
  });
  it("treats an explicit skip as neutral information, not a blank", () => {
    const entries = [makeEntry({ taskId: "a", dayJdn: today.jdn, status: STATUS.SKIPPED })];
    const s = summarise(tasks, entries, today.jdn);
    expect(s.skipped).toBe(1);
    expect(s.unknown).toBe(2);
    expect(s.adherence).toBe(0);
  });
});

describe("logging", () => {
  it("lets the user change their mind — the latest entry wins", () => {
    const entries = [
      makeEntry({ taskId: "a", dayJdn: today.jdn, status: STATUS.SKIPPED }),
      makeEntry({ taskId: "a", dayJdn: today.jdn, status: STATUS.DONE }),
    ];
    expect(statusOf(entries, "a", today.jdn).status).toBe(STATUS.DONE);
  });
  it("records when something actually happened, not when it was planned", () => {
    const e = makeEntry({ taskId: "a", dayJdn: today.jdn, status: STATUS.DONE, atMin: 11 * 60 + 20 });
    expect(fmtTime(e.atMin)).toBe("11:20");
  });
  it("counts unplanned work that actually happened", () => {
    const entries = [
      makeEntry({ taskId: "x", dayJdn: today.jdn, status: STATUS.DONE, unplanned: true, durationMin: 45 }),
    ];
    const s = summarise([], entries, today.jdn);
    expect(s.unplannedCount).toBe(1);
    expect(s.actualMin).toBe(45);
  });
  it("supports rescheduling as its own outcome", () => {
    const entries = [makeEntry({ taskId: "a", dayJdn: today.jdn, status: STATUS.RESCHEDULED, movedToJdn: today.jdn + 1 })];
    expect(summarise([{ id: "a", duration: 10 }], entries, today.jdn).rescheduled).toBe(1);
  });
  it("rejects an unknown status outright", () => {
    expect(() => makeEntry({ taskId: "a", dayJdn: 1, status: "failed" })).toThrow(/Unknown status/);
  });
});

describe("gaps, rest and travel", () => {
  it("fills the space between tasks with rest", () => {
    const line = timelineWithGaps([
      { id: "a", startMin: 480, duration: 60 },
      { id: "b", startMin: 600, duration: 60 },
    ], { dayStartMin: 480, dayEndMin: 720 });
    const gaps = line.filter((s) => s.kind === "gap");
    expect(gaps[0].gapKind).toBe(GAP_KINDS.REST);
    expect(gaps[0].durationMin).toBe(60);
  });
  it("labels a gap as travel when the place changes", () => {
    const line = timelineWithGaps([
      { id: "a", startMin: 480, duration: 60, place: "Home" },
      { id: "b", startMin: 600, duration: 30, place: "Store" },
    ], { dayStartMin: 480, dayEndMin: 660 });
    const travel = line.find((s) => s.kind === "gap" && s.gapKind === GAP_KINDS.TRAVEL);
    expect(travel).toBeTruthy();
    expect(travel.from).toBe("Home");
    expect(travel.to).toBe("Store");
  });
  it("flags overlapping tasks rather than hiding them", () => {
    const line = timelineWithGaps([
      { id: "a", startMin: 480, duration: 120 },
      { id: "b", startMin: 540, duration: 60 },
    ], { dayStartMin: 480, dayEndMin: 720 });
    expect(line.some((s) => s.kind === "overlap")).toBe(true);
  });
});

describe("now slice — the daily page query", () => {
  const tasks = [
    { id: "1", startMin: 480, duration: 30 },
    { id: "2", startMin: 540, duration: 30 },
    { id: "3", startMin: 830, duration: 60 },  // spans 13:50-14:50
    { id: "4", startMin: 960, duration: 30 },
    { id: "5", startMin: 1020, duration: 30 },
    { id: "6", startMin: 1080, duration: 30 },
  ];
  it("finds what is happening right now", () => {
    expect(nowSlice(tasks, 14 * 60).current.id).toBe("3");
  });
  it("shows a few recent past tasks", () => {
    expect(nowSlice(tasks, 14 * 60).past.map((t) => t.id)).toEqual(["1", "2"]);
  });
  it("shows the next few upcoming tasks", () => {
    expect(nowSlice(tasks, 14 * 60).upcoming.map((t) => t.id)).toEqual(["4", "5", "6"]);
  });
  it("returns no current task when in a gap", () => {
    expect(nowSlice(tasks, 12 * 60).current).toBeNull();
  });
});

describe("time parsing", () => {
  it("parses valid times", () => expect(parseTime("09:45")).toBe(585));
  it("rejects nonsense", () => {
    expect(parseTime("25:00")).toBeNull();
    expect(parseTime("abc")).toBeNull();
  });
});
