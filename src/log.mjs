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
  if (min < 60) return `${min}ደ`;
  const h = min / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)}ሰ`;
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
    return { ok: false, reason: "ያ ቀን ገና አልደረሰም።" };
  }
  if (dayJdn === now.jdn && actualMin != null && actualMin > now.minutes) {
    return {
      ok: false,
      reason: `አሁን ${fmtTime(now.minutes)} ነው — ${fmtTime(actualMin)} ላይ የሆነ ነገር መመዝገብ አይቻልም።`,
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
 * A continuous timeline, not a task list. Every minute is a task, a gap, or an
 * overlap. Gaps between tasks in different places are TRAVEL — you cannot clean
 * the house and then buy something at a store without moving between them.
 */
export const timelineWithGaps = (tasks, { dayStartMin = 360, dayEndMin = 1440 } = {}) => {
  const placed = tasks
    .filter((t) => t.startMin != null)
    .sort((a, b) => a.startMin - b.startMin);

  const out = [];
  let cursor = dayStartMin;

  for (const task of placed) {
    const gap = task.startMin - cursor;
    if (gap > 0) {
      const prev = out.length ? out[out.length - 1] : null;
      const moving =
        prev && prev.kind === "task" && prev.task.place && task.place &&
        prev.task.place !== task.place;
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
  return out;
};

/** What just passed, what is happening now, what is next. */
export const nowSlice = (tasks, nowMin, { pastCount = 2, futureCount = 3 } = {}) => {
  const placed = tasks
    .filter((t) => t.startMin != null)
    .sort((a, b) => a.startMin - b.startMin);
  const current =
    placed.find((t) => t.startMin <= nowMin && nowMin < t.startMin + (t.duration ?? 0)) ?? null;
  const past = placed.filter((t) => t.startMin + (t.duration ?? 0) <= nowMin).slice(-pastCount);
  const upcoming = placed.filter((t) => t.startMin > nowMin).slice(0, futureCount);
  return { past, current, upcoming };
};
