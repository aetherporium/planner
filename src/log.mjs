/**
 * The log — reality, as distinct from the Blueprint's ideal.
 *
 * Three rules from the brief drive this module, and they are the reason it is
 * separate from the Blueprint:
 *
 * 1. BLANK IS NOT "NOT DONE". Absence of information is its own state. A day
 *    that has not been reviewed must never be reported as failure.
 * 2. YOU CANNOT HAVE DONE SOMETHING IN THE FUTURE. A completion is an
 *    observation about the past, so it is rejected if its time has not passed.
 * 3. NOT DOING IS NOT PUNISHED. `skipped` is a neutral, explicit answer. The
 *    vocabulary carries no blame and no score.
 */

/** The four states an occurrence can be in. */
export const STATUS = {
  UNKNOWN: "unknown", // default — no information. NOT a failure.
  DONE: "done",
  SKIPPED: "skipped", // explicitly not done. Neutral.
  RESCHEDULED: "rescheduled",
};

export const MINUTES_IN_DAY = 1440;

export const clampMin = (m) => Math.max(0, Math.min(MINUTES_IN_DAY - 1, Math.round(m)));

export const fmtTime = (min) => {
  const m = clampMin(min);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
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
 * The brief: "when you say action done, it must be in the past. so you don't lie
 * say I did a thing, but tasks can't be done that time."
 *
 * A completion at time T on day D is only truthful once T has actually passed.
 * The check is (day, minute) against (today, now) — never a date alone, or an
 * evening task could be marked done at breakfast.
 */
export const canCompleteAt = ({ dayJdn, atMin }, now) => {
  if (dayJdn > now.jdn) {
    return { ok: false, reason: "That day hasn't happened yet." };
  }
  if (dayJdn === now.jdn && atMin > now.minutes) {
    return {
      ok: false,
      reason: `It's only ${fmtTime(now.minutes)} — you can't log something at ${fmtTime(atMin)} yet.`,
    };
  }
  return { ok: true };
};

/**
 * Log an entry.
 *
 * `at` is when it ACTUALLY happened, which may differ from when it was planned.
 * That difference is the interesting data, so it is preserved rather than
 * normalised away.
 */
export const makeEntry = ({
  taskId,
  dayJdn,
  status,
  atMin = null,
  durationMin = null,
  note = "",
  unplanned = false,
  movedToJdn = null,
}) => {
  if (!Object.values(STATUS).includes(status)) {
    throw new Error(`Unknown status: ${status}`);
  }
  return {
    id: `e${Math.random().toString(36).slice(2, 10)}`,
    taskId,
    dayJdn,
    status,
    atMin,
    durationMin,
    note,
    unplanned,
    movedToJdn,
    loggedAtJdn: dayJdn,
  };
};

/**
 * Resolve one occurrence's status from the log.
 * Later entries win, so a user can change their mind freely.
 */
export const statusOf = (entries, taskId, dayJdn) => {
  const found = entries.filter((e) => e.taskId === taskId && e.dayJdn === dayJdn);
  return found.length ? found[found.length - 1] : null;
};

/**
 * Day summary — deliberately reports UNKNOWN separately from SKIPPED.
 *
 * Merging them would turn "I haven't reviewed today" into "I failed today",
 * which is the exact behaviour the brief rules out.
 */
export const summarise = (blueprintTasks, entries, dayJdn) => {
  let done = 0, skipped = 0, unknown = 0, rescheduled = 0;
  let plannedMin = 0, actualMin = 0;

  for (const task of blueprintTasks) {
    plannedMin += task.duration ?? 0;
    const entry = statusOf(entries, task.id, dayJdn);
    if (!entry) { unknown++; continue; }
    if (entry.status === STATUS.DONE) {
      done++;
      actualMin += entry.durationMin ?? task.duration ?? 0;
    } else if (entry.status === STATUS.SKIPPED) skipped++;
    else if (entry.status === STATUS.RESCHEDULED) rescheduled++;
    else unknown++;
  }

  // Unplanned work still counts as effort spent.
  const unplanned = entries.filter(
    (e) => e.dayJdn === dayJdn && e.unplanned && e.status === STATUS.DONE,
  );
  for (const e of unplanned) actualMin += e.durationMin ?? 0;

  return {
    done, skipped, unknown, rescheduled,
    unplannedCount: unplanned.length,
    plannedMin, actualMin,
    /** Only over answered occurrences — unknown never drags this down. */
    answered: done + skipped + rescheduled,
    adherence: done + skipped + rescheduled === 0
      ? null
      : done / (done + skipped + rescheduled),
  };
};

// ── Gaps, rest and travel ───────────────────────────────────────────────────

/**
 * The brief: "we plan every little detail, meaning the blank spaces or rest we
 * consider, could be default rest, or like traveling — I can't just clean my
 * house and buy an item from a store without traveling."
 *
 * So gaps between scheduled tasks are first-class. An unlabelled gap is REST by
 * default; a gap between tasks in different places is TRAVEL and gets flagged,
 * because unplanned travel is the classic reason a day silently overruns.
 */
export const GAP_KINDS = { REST: "rest", TRAVEL: "travel", BUFFER: "buffer" };

export const timelineWithGaps = (tasks, { dayStartMin = 360, dayEndMin = 1380 } = {}) => {
  const placed = tasks
    .filter((t) => t.startMin != null)
    .sort((a, b) => a.startMin - b.startMin);

  const out = [];
  let cursor = dayStartMin;

  for (const task of placed) {
    const gap = task.startMin - cursor;
    if (gap > 0) {
      const movingPlaces =
        out.length > 0 &&
        out[out.length - 1].kind === "task" &&
        out[out.length - 1].task.place &&
        task.place &&
        out[out.length - 1].task.place !== task.place;

      out.push({
        kind: "gap",
        gapKind: movingPlaces ? GAP_KINDS.TRAVEL : GAP_KINDS.REST,
        startMin: cursor,
        endMin: task.startMin,
        durationMin: gap,
        from: movingPlaces ? out[out.length - 1].task.place : null,
        to: movingPlaces ? task.place : null,
      });
    } else if (gap < 0) {
      out.push({
        kind: "overlap",
        startMin: task.startMin,
        endMin: cursor,
        durationMin: -gap,
      });
    }
    out.push({ kind: "task", task, startMin: task.startMin, endMin: task.startMin + (task.duration ?? 0) });
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

/**
 * Split a day's tasks around a moment: what just passed, what is happening now,
 * what is next. This is the daily page's core query.
 */
export const nowSlice = (tasks, nowMin, { pastCount = 2, futureCount = 3 } = {}) => {
  const placed = tasks
    .filter((t) => t.startMin != null)
    .sort((a, b) => a.startMin - b.startMin);

  const current = placed.find(
    (t) => t.startMin <= nowMin && nowMin < t.startMin + (t.duration ?? 0),
  ) ?? null;

  const past = placed.filter((t) => t.startMin + (t.duration ?? 0) <= nowMin).slice(-pastCount);
  const upcoming = placed.filter((t) => t.startMin > nowMin).slice(0, futureCount);

  return { past, current, upcoming };
};
