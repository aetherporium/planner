/**
 * Patterns and categories — the two ways tasks group themselves.
 *
 * A PATTERN is not authored. It is the recurrence a task already has, observed
 * and named. If no task repeats every weekend, there is no "every weekend"
 * pattern — empty patterns are never shown, because an empty shelf is not a
 * thing you own.
 *
 * Patterns are ordered by HOW OFTEN THEY FIRE, most frequent first: daily,
 * then weekday/weekend, then a specific day of the week, then monthly, then
 * holidays. An unrecognised recurrence still gets a pattern, named
 * "Pattern 1", "Pattern 2", … in the order it was first seen.
 *
 * A CATEGORY is authored. It is the user's own grouping — "School", "Home" —
 * and carries a colour. A task can sit in exactly one category and still
 * belong to whatever pattern its recurrence implies.
 */

import { DOW } from "./calendar.mjs";

/**
 * Firings per year, used only for ordering. Approximate on purpose — the
 * ordering is what matters, not the arithmetic.
 */
export const timesPerYear = (rule) => {
  if (!rule) return 1;
  switch (rule.kind) {
    case "everyday": return 365;
    case "weekday": return 261;
    case "weekend": return 104;
    case "dow": return 52;
    case "ec-monthday": return 13;
    case "gc-monthday": return 12;
    case "holiday": return 9;
    case "dates": return rule.dates?.length ?? 1;
    default: return 0;
  }
};

/** How often, in words. Shown under the pattern name. */
export const cadence = (rule) => {
  if (!rule) return "Once";
  switch (rule.kind) {
    case "everyday": return "365 times a year";
    case "weekday": return "5 days a week";
    case "weekend": return "2 days a week";
    case "dow": return "Once a week";
    case "ec-monthday": return "13 times a year";
    case "gc-monthday": return "12 times a year";
    case "holiday": return "On holidays";
    case "dates": return `${rule.dates?.length ?? 1} time${(rule.dates?.length ?? 1) === 1 ? "" : "s"}`;
    default: return "";
  }
};

/**
 * The stable identity of a recurrence. Two tasks with the same key belong to
 * the same pattern.
 */
export const patternKey = (rule) => {
  if (!rule) return null;
  switch (rule.kind) {
    case "everyday":
    case "weekday":
    case "weekend":
    case "holiday":
      return rule.kind;
    case "dow": return `dow${rule.dow}`;
    case "gc-monthday": return `gcd${rule.day}`;
    case "ec-monthday": return `ecd${rule.day}`;
    default: return null;
  }
};

/**
 * The name a pattern shows. Known recurrences read plainly; anything else is
 * numbered, and the number is assigned by the caller in first-seen order.
 */
export const patternName = (rule, ordinal) => {
  if (!rule) return `Pattern ${ordinal}`;
  switch (rule.kind) {
    case "everyday": return "Daily";
    case "weekday": return "Weekdays";
    case "weekend": return "Weekends";
    case "dow": return DOW[rule.dow];
    case "gc-monthday": return `Day ${rule.day} monthly`;
    case "ec-monthday": return `Day ${rule.day}, Ethiopian`;
    case "holiday": return "Holidays";
    default: return `Pattern ${ordinal}`;
  }
};

/**
 * Derive the patterns actually present in a task list.
 *
 * Only recurrences that some task uses appear. Ordered by frequency, then by
 * first appearance so the order is stable between renders.
 */
export const patternsIn = (tasks) => {
  const byKey = new Map();
  let unknownSeq = 0;

  for (const t of tasks) {
    if (!t.rule) continue;
    const key = patternKey(t.rule);
    if (key == null) {
      // An unfamiliar recurrence still deserves a shelf.
      const k = `pattern${++unknownSeq}`;
      byKey.set(k, {
        id: k,
        rule: t.rule,
        name: `Pattern ${unknownSeq}`,
        cadence: cadence(t.rule),
        rank: timesPerYear(t.rule),
        tasks: [t],
        seen: byKey.size,
      });
      continue;
    }
    const found = byKey.get(key);
    if (found) {
      found.tasks.push(t);
    } else {
      byKey.set(key, {
        id: key,
        rule: t.rule,
        name: patternName(t.rule),
        cadence: cadence(t.rule),
        rank: timesPerYear(t.rule),
        tasks: [t],
        seen: byKey.size,
      });
    }
  }

  return [...byKey.values()].sort((a, b) => b.rank - a.rank || a.seen - b.seen);
};

/** Palette offered when a category is created. */
export const CATEGORY_COLORS = [
  { id: "green", label: "Green", hue: 162 },
  { id: "blue", label: "Blue", hue: 214 },
  { id: "violet", label: "Violet", hue: 268 },
  { id: "rose", label: "Rose", hue: 4 },
  { id: "amber", label: "Amber", hue: 38 },
  { id: "slate", label: "Slate", hue: 220 },
];

export const colorOf = (id) => CATEGORY_COLORS.find((c) => c.id === id) ?? CATEGORY_COLORS[0];

/** Tasks grouped into the user's own categories, plus whatever is loose. */
export const categorise = (tasks, categories) => {
  const groups = categories.map((c) => ({
    ...c,
    tasks: tasks.filter((t) => t.categoryId === c.id),
  }));
  const loose = tasks.filter((t) => !t.categoryId || !categories.some((c) => c.id === t.categoryId));
  return { groups, loose };
};
