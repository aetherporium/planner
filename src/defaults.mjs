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
    // Not an event at a time — a target you fill across the whole day. It is a
    // default because a body needs it as surely as it needs sleep, and because
    // it is the clearest case of a task the clock alone cannot express.
    key: "water",
    title: "Drink water",
    titleAm: "ውሃ መጠጣት",
    rule: { kind: "everyday" },
    // A tally, but a PLANNED one. The target is not a vague daily hope you
    // remember at 11pm — it is placed at real times through the day, so the
    // timeline can remind you and you can just do as planned.
    kind: "tally",
    unit: "ml",
    target: 2500,
    step: 250,
    startMin: 6 * 60 + 30,
    duration: 0,
    slots: [
      6 * 60 + 30,   // on waking
      8 * 60 + 30,
      10 * 60 + 30,
      12 * 60 + 30,  // with lunch
      14 * 60 + 30,
      16 * 60 + 30,
      18 * 60 + 30,
      20 * 60,       // last one early enough not to wake you
    ],
    slotAmount: 310,
    place: null,
    isDefault: true,
  },
  {
    key: "wake",
    title: "Wake",
    titleAm: "መነሳት",
    rule: { kind: "everyday" },
    startMin: 6 * 60,
    // A MOMENT, not a block. Waking takes no time — it is the instant the day
    // starts. Giving it a duration would invent five minutes you never spent.
    duration: 0,
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
    kind: "measure",
    unit: "hr",
    target: 8,
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
