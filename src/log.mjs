/**
 * The log — reality, kept separate from the Blueprint's ideal.
 *
 * THREE KINDS OF TIME. Conflating any two of them loses information:
 *
 *   1. PLANNED  (የታቀደ)     — when the blueprint says it should happen.
 *   2. ACTUAL   (የተከናወነበት) — when it really happened.
 *   3. LOG      (የተመዘገበበት) — when the user told the app about it.
 *
 * Logging dinner at 23:00 that you ate at 19:00 is three different facts:
 * planned 19:00, actual 19:00, logged 23:00. All three are kept.
 *
 * Rules from the brief that this module enforces:
 *   - Blank is not "not done". Absence of information is its own state.
 *   - You cannot have done something in the future.
 *   - Not doing is not punished. `skipped` is neutral and explicit.
 */

export const STATUS = {
  UNKNOWN: "unknown", // default — no information. NOT failure.
  DONE: "done",
  SKIPPED: "skipped", // explicitly not done. Neutral.
  RESCHEDULED: "rescheduled",
};

export const MINUTES_IN_DAY = 1440;

export const clampMin = (m) => Math.max(0, Math.min(MINUTES_IN_DAY - 1, Math.round(m)));

export const fmtTime = (min) => {
  if (min == null) return "—";
  const m = ((Math.round(min) % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

export const fmtDur = (min) => {
  if (min == null) return "—";
  if (min < 60) return `${min} min`;
  const h = min / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} hr`;
};

export const parseTime = (str) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(str).trim());
  if (!match) return null;
  const h = Number(match[1]);
  const mi = Number(match[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
};

/**
 * Can this be marked done yet?
 *
 * A completion at ACTUAL time T on day D is only truthful once T has passed.
 * Checked as (day, minute) vs (today, now) — a date-only check would let an
 * evening task be ticked at breakfast.
 */
export const canCompleteAt = ({ dayJdn, actualMin }, now) => {
  if (dayJdn > now.jdn) {
    return { ok: false, reason: "That day hasn\u2019t happened yet." };
  }
  if (dayJdn === now.jdn && actualMin != null && actualMin > now.minutes) {
    return {
      ok: false,
      reason: `It\u2019s ${fmtTime(now.minutes)} now. You can\u2019t record something that happens at ${fmtTime(actualMin)} yet.`,
    };
  }
  return { ok: true };
};

let entrySeq = 0;
export const __resetEntryIds = () => { entrySeq = 0; };

/**
 * Log an entry. `now` supplies the LOG time — never inferred from the day.
 */
export const makeEntry = ({
  taskId,
  dayJdn,
  status,
  plannedMin = null,
  actualMin = null,
  durationMin = null,
  note = "",
  unplanned = false,
  title = null,
  movedToJdn = null,
  amount = null,   // tally / measure: how much, in the task's own unit
  checked = null,  // checklist: which items are ticked
}, now) => {
  if (!Object.values(STATUS).includes(status)) {
    throw new Error(`Unknown status: ${status}`);
  }
  return {
    id: `e${++entrySeq}`,
    taskId,
    dayJdn,
    status,
    plannedMin,
    actualMin,
    durationMin,
    note,
    unplanned,
    title,
    movedToJdn,
    amount,
    checked,
    loggedAtJdn: now?.jdn ?? dayJdn,
    loggedAtMin: now?.minutes ?? null,
  };
};

/** Latest entry wins, so the user can freely change their mind. */
export const statusOf = (entries, taskId, dayJdn) => {
  const found = entries.filter((e) => e.taskId === taskId && e.dayJdn === dayJdn);
  return found.length ? found[found.length - 1] : null;
};

/** Was this logged on a different day than it happened? */
export const loggedLate = (entry) =>
  entry.loggedAtJdn != null && entry.loggedAtJdn !== entry.dayJdn;

/** Did it happen at a different time than planned? */
export const driftedFromPlan = (entry) =>
  entry.plannedMin != null && entry.actualMin != null && entry.plannedMin !== entry.actualMin;

// ── Gaps, rest and travel ───────────────────────────────────────────────────

export const GAP_KINDS = { REST: "rest", TRAVEL: "travel" };

/**
 * A task with no duration is a MOMENT — waking, a alarm, a deadline. It marks
 * an instant on the day rather than occupying a stretch of it, so it neither
 * fills time nor creates a gap around itself.
 */

/**
 * A continuous timeline, not a task list. Every minute is a task, a gap, or an
 * overlap. Gaps between tasks in different places are TRAVEL — you cannot clean
 * the house and then buy something at a store without moving between them.
 */
/**
 * A moment is an instant on the clock — waking, a dose, a phone call landing.
 *
 * A SPREAD task (drink water) also has no duration, but for the opposite
 * reason: it is not at a point in time at all, it is smeared across the whole
 * day. Both have `duration === 0`, so the kind has to be consulted, or the
 * timeline would draw a hairline at dawn for something that has no place on
 * the ruler.
 */
export const isSpreadTask = (task) => task?.kind === "tally";

/**
 * A planned tally appears on the ruler once per slot — eight small marks
 * rather than one block. Each is an instant you act on, so they behave like
 * moments: no height, no gap, no cursor movement.
 */
export const slotsOf = (task) =>
  isSpreadTask(task) && Array.isArray(task.slots) ? task.slots : [];
export const isMoment = (task) =>
  (task?.duration ?? 0) === 0 && !isSpreadTask(task);

export const timelineWithGaps = (tasks, { dayStartMin = 360, dayEndMin = 1440 } = {}) => {
  const placed = tasks
    // A spread task has no single position; it is expanded into its slots below.
    .filter((t) => t.startMin != null && !isSpreadTask(t))
    .sort((a, b) => a.startMin - b.startMin);

  const out = [];
  let cursor = dayStartMin;

  for (const task of placed) {
    // Moments mark an instant. They do not consume time, so they never open a
    // gap behind them and never push the cursor forward.
    if (isMoment(task)) {
      out.push({ kind: "moment", task, startMin: task.startMin, endMin: task.startMin });
      continue;
    }

    const gap = task.startMin - cursor;
    if (gap > 0) {
      const prev = [...out].reverse().find((o) => o.kind === "task") ?? null;
      const moving =
        prev && prev.task.place && task.place && prev.task.place !== task.place;
      out.push({
        kind: "gap",
        gapKind: moving ? GAP_KINDS.TRAVEL : GAP_KINDS.REST,
        startMin: cursor,
        endMin: task.startMin,
        durationMin: gap,
        from: moving ? prev.task.place : null,
        to: moving ? task.place : null,
      });
    } else if (gap < 0) {
      out.push({ kind: "overlap", startMin: task.startMin, endMin: cursor, durationMin: -gap });
    }
    out.push({
      kind: "task",
      task,
      startMin: task.startMin,
      endMin: task.startMin + (task.duration ?? 0),
    });
    cursor = Math.max(cursor, task.startMin + (task.duration ?? 0));
  }

  if (cursor < dayEndMin) {
    out.push({
      kind: "gap",
      gapKind: GAP_KINDS.REST,
      startMin: cursor,
      endMin: dayEndMin,
      durationMin: dayEndMin - cursor,
      from: null,
      to: null,
    });
  }

  /**
   * Planned tally slots ride ON TOP of the day. They take no time and never
   * open a gap, so they are added after the cursor walk rather than during
   * it — a sip of water does not interrupt a lesson.
   */
  for (const task of tasks) {
    for (const [i, at] of slotsOf(task).entries()) {
      if (at < dayStartMin || at > dayEndMin) continue;
      out.push({ kind: "slot", task, index: i, startMin: at, endMin: at });
    }
  }

  return out.sort((a, b) => a.startMin - b.startMin);
};

/** What just passed, what is happening now, what is next. */
export const nowSlice = (tasks, nowMin, { pastCount = 2, futureCount = 3 } = {}) => {
  const placed = tasks
    // A spread task has no single position; it is expanded into its slots below.
    .filter((t) => t.startMin != null && !isSpreadTask(t))
    .sort((a, b) => a.startMin - b.startMin);
  const current =
    placed.find((t) =>
      isMoment(t) ? t.startMin === nowMin : t.startMin <= nowMin && nowMin < t.startMin + t.duration,
    ) ?? null;
  const past = placed
    .filter((t) => (isMoment(t) ? t.startMin < nowMin : t.startMin + (t.duration ?? 0) <= nowMin))
    .slice(-pastCount);
  const upcoming = placed.filter((t) => t.startMin > nowMin).slice(0, futureCount);
  return { past, current, upcoming };
};

/**
 * What a proposed task would collide with.
 *
 * The scheduler never silently refuses and never silently accepts. It reports
 * exactly what is in the way, so the answer is visible rather than a disabled
 * button with no reason. Overlapping is sometimes correct — a call during a
 * commute is real — so this returns findings, not a verdict.
 *
 * Dawn-relative minutes throughout.
 */
export function conflictsFor({ startMin, duration = 0, place = null, ignoreId = null }, tasks) {
  const endMin = startMin + duration;
  const out = [];

  for (const t of tasks) {
    if (t.id === ignoreId) continue;
    if (t.startMin == null || isSpreadTask(t)) continue;

    const tEnd = t.startMin + (t.duration ?? 0);

    // A moment inside the span is not a clash — an instant fits anywhere.
    if (isMoment(t)) continue;

    const overlaps = startMin < tEnd && t.startMin < endMin;
    if (overlaps) {
      const from = Math.max(startMin, t.startMin);
      const to = Math.min(endMin, tEnd);
      out.push({
        kind: "overlap",
        task: t,
        minutes: Math.max(0, to - from),
        startMin: from,
        endMin: to,
      });
      continue;
    }

    // Back-to-back in different places needs travel time that does not exist.
    if (place && t.place && place !== t.place) {
      const gapAfter = t.startMin - endMin;
      const gapBefore = startMin - tEnd;
      const gap = gapAfter >= 0 ? gapAfter : gapBefore;
      if (gap >= 0 && gap < 15) {
        out.push({ kind: "tight", task: t, minutes: gap, from: t.place, to: place });
      }
    }
  }

  return out.sort((a, b) => b.minutes - a.minutes);
}

/** The nearest span of free time that fits, searched forward then backward. */
export function nextFreeSlot({ startMin, duration }, tasks, { dayEndMin = 1440 } = {}) {
  if (!duration) return null;
  const busy = tasks
    .filter((t) => t.startMin != null && !isSpreadTask(t) && !isMoment(t))
    .map((t) => [t.startMin, t.startMin + (t.duration ?? 0)])
    .sort((a, b) => a[0] - b[0]);

  const free = [];
  let cursor = 0;
  for (const [s, e] of busy) {
    if (s - cursor >= duration) free.push([cursor, s]);
    cursor = Math.max(cursor, e);
  }
  if (dayEndMin - cursor >= duration) free.push([cursor, dayEndMin]);
  if (!free.length) return null;

  // Prefer the closest start to what was asked for.
  let best = null;
  for (const [s, e] of free) {
    const candidate = Math.min(Math.max(startMin, s), e - duration);
    const distance = Math.abs(candidate - startMin);
    if (!best || distance < best.distance) best = { startMin: candidate, distance };
  }
  return best ? best.startMin : null;
}
