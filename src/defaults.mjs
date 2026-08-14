/**
 * Default blueprint tasks — the things a body does every day regardless of plans.
 *
 * These exist for every user from day zero. They can be DISABLED explicitly, but
 * never silently vanish: a disabled default stays visible as disabled, because
 * "I chose not to track this" is different from "this was never here".
 *
 * ATOMICITY RULE: one activity per task. "Wake & stretch" is two activities and
 * must never be one task — waking is its own event, stretching is a separate
 * choice. Compound titles hide the fact that you did one and not the other.
 */

export const DEFAULT_TASKS = [
  {
    key: "wake",
    title: "Wake",
    titleAm: "መነሳት",
    rule: { kind: "everyday" },
    startMin: 6 * 60,
    duration: 5,
    place: "Home",
    isDefault: true,
  },
  {
    key: "breakfast",
    title: "Breakfast",
    titleAm: "ቁርስ",
    rule: { kind: "everyday" },
    startMin: 7 * 60,
    duration: 30,
    place: "Home",
    isDefault: true,
  },
  {
    key: "lunch",
    title: "Lunch",
    titleAm: "ምሳ",
    rule: { kind: "everyday" },
    startMin: 12 * 60 + 30,
    duration: 45,
    place: "Home",
    isDefault: true,
  },
  {
    key: "dinner",
    title: "Dinner",
    titleAm: "እራት",
    rule: { kind: "everyday" },
    startMin: 19 * 60 + 30,
    duration: 45,
    place: "Home",
    isDefault: true,
  },
  {
    key: "sleep",
    title: "Sleep",
    titleAm: "እንቅልፍ",
    rule: { kind: "everyday" },
    startMin: 22 * 60 + 30,
    duration: 450,
    place: "Home",
    isDefault: true,
  },
];

/** Build the default task set. `disabled` is a Set of keys the user turned off. */
export const buildDefaults = (disabled = new Set()) =>
  DEFAULT_TASKS.map((t) => ({
    ...t,
    id: `default:${t.key}`,
    enabled: !disabled.has(t.key),
  }));

export const isDefaultTask = (task) => task.isDefault === true;
