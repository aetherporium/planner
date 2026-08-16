/**
 * Task kinds — what a task *is*, beyond when it happens.
 *
 * Most tasks are just a block of time. Some are not: drinking water is a
 * target you fill up over a day, sleep is a duration you measure afterwards,
 * a gym session has sets you tick off one at a time.
 *
 * A kind adds a way of MEASURING and a way of LOGGING. It never changes how a
 * task is scheduled — a kind is orthogonal to the pattern, the category and
 * the clock.
 *
 * The measurement lives on the log entry, not the task: the task says "2500 ml
 * across the day", the entry says "1400 ml so far today". Keeping them apart
 * is what lets the same task be judged differently on different days.
 */

export const KIND = {
  PLAIN: "plain",
  TALLY: "tally",       // fill up to a target over the day (water, steps)
  MEASURE: "measure",   // one number recorded once (sleep hours, weight)
  CHECKLIST: "checklist", // ordered items ticked off (gym sets, packing)
};

/**
 * Kinds a user can choose, with the vocabulary each one needs.
 * `unit` is a default, not a constraint — it is editable per task.
 */
export const KINDS = [
  {
    id: KIND.PLAIN,
    name: "Plain",
    blurb: "A block of time. Done or not done.",
    icon: "check",
  },
  {
    id: KIND.TALLY,
    name: "Tally",
    blurb: "Add up to a target across the day.",
    icon: "water",
    unit: "ml",
    target: 2500,
    step: 250,
  },
  {
    id: KIND.MEASURE,
    name: "Measure",
    blurb: "Record one number when it is over.",
    icon: "gauge",
    unit: "hr",
    target: 8,
  },
  {
    id: KIND.CHECKLIST,
    name: "Checklist",
    blurb: "Tick items off in order.",
    icon: "list",
  },
];

export const kindOf = (id) => KINDS.find((k) => k.id === id) ?? KINDS[0];

/** A tally task is spread across the day rather than sitting at one time. */
export const isSpread = (task) => task?.kind === KIND.TALLY;

/**
 * How far along a measured task is.
 * Returns null for a plain task — "no progress" and "0% progress" are
 * different things and must not render the same.
 */
export function progressOf(task, entry) {
  if (!task?.kind || task.kind === KIND.PLAIN) return null;

  if (task.kind === KIND.CHECKLIST) {
    const items = task.items ?? [];
    if (!items.length) return null;
    const done = (entry?.checked ?? []).length;
    return { done, total: items.length, ratio: done / items.length, unit: "" };
  }

  const target = task.target ?? 0;
  const done = entry?.amount ?? 0;
  if (!target) return { done, total: null, ratio: null, unit: task.unit ?? "" };
  return {
    done,
    total: target,
    ratio: Math.min(1, done / target),
    unit: task.unit ?? "",
  };
}

/** "1400 / 2500 ml" or "3 of 5" — the reading a person actually wants. */
export function readProgress(task, entry) {
  const p = progressOf(task, entry);
  if (!p) return null;
  if (task.kind === KIND.CHECKLIST) return `${p.done} of ${p.total}`;
  if (p.total == null) return `${p.done} ${p.unit}`.trim();
  return `${p.done} / ${p.total} ${p.unit}`.trim();
}

/**
 * A tally spread over waking hours: how much you *should* have done by now,
 * so the app can say "you are behind" without nagging about it constantly.
 * Dawn-relative minutes in, amount out.
 */
export function paceTarget(task, fromDawnMin, wakingMinutes = 16 * 60) {
  if (!isSpread(task) || !task.target) return null;
  const through = Math.max(0, Math.min(1, fromDawnMin / wakingMinutes));
  return Math.round(task.target * through);
}
