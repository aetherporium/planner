/**
 * Blueprint — the ideal.
 *
 * A Blueprint Rule says "this happens on days like THIS". Expanding a rule
 * against a day answers: is this part of what I always do on this kind of day?
 *
 * The Blueprint is not a schedule. It is the shape of an ordinary day of a given
 * kind. Reality is logged separately, and the difference between them is
 * information — never a failure. See ADR-0004.
 */

export const RULE_KINDS = [
  "everyday",
  "weekday",
  "weekend",
  "dow",
  "gc-monthday",
  "ec-monthday",
  "holiday",
  "dates",
];

/** Human phrasing for a rule — used everywhere the rule is shown. */
export const describeRule = (rule) => {
  switch (rule.kind) {
    case "everyday": return "Every day";
    case "weekday": return "Every weekday";
    case "weekend": return "Every weekend";
    case "dow": return `Every ${["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][rule.dow]}`;
    case "gc-monthday": return `Day ${rule.day} of each Gregorian month`;
    case "ec-monthday": return `Day ${rule.day} of each Ethiopian month`;
    case "holiday": return rule.name ? `Every ${rule.name}` : "Every holiday";
    case "dates": return `${rule.dates.length} specific date${rule.dates.length === 1 ? "" : "s"}`;
    default: return "Unknown rule";
  }
};

/** Does this rule fire on this day? */
export const firesOn = (rule, day) => {
  switch (rule.kind) {
    case "everyday":
      return true;
    case "weekday":
      return !day.isWeekend;
    case "weekend":
      return day.isWeekend;
    case "dow":
      return day.dow === rule.dow;
    case "gc-monthday":
      return day.gc.d === rule.day;
    case "ec-monthday":
      return day.ec.d === rule.day;
    case "holiday":
      return rule.name
        ? day.holidays.includes(rule.name)
        : day.holidays.length > 0;
    case "dates":
      return rule.dates.includes(day.iso);
    default:
      return false;
  }
};

/**
 * The blueprint for a day: every Task whose rule fires, in planned-time order.
 *
 * `tasks` are blueprint definitions — a Task plus the rule that places it.
 */
export const blueprintFor = (tasks, day) =>
  tasks
    .filter((t) => t.rule && firesOn(t.rule, day))
    .sort((a, b) => (a.startMin ?? 0) - (b.startMin ?? 0));

/**
 * Which rule kinds a given day satisfies. Powers "what kind of day is this?"
 * and lets the UI explain WHY a task appeared.
 */
export const conditionsMet = (day) => {
  const met = ["everyday"];
  if (day.isWeekend) met.push("weekend");
  else met.push("weekday");
  met.push(`dow:${day.dow}`);
  met.push(`gc-monthday:${day.gc.d}`);
  met.push(`ec-monthday:${day.ec.d}`);
  if (day.holidays.length) met.push("holiday");
  return met;
};

/**
 * When a Task is added with a recurring frequency, it may already satisfy a
 * blueprint condition — the user asked for those to flow into the Blueprint
 * automatically rather than being retyped.
 *
 * Returns a suggested rule, or null when the task is genuinely one-off.
 */
export const ruleFromFrequency = (frequency, day) => {
  switch (frequency) {
    case "daily":
      return { kind: "everyday" };
    case "weekly":
      return { kind: "dow", dow: day.dow };
    case "monthly":
      return { kind: "gc-monthday", day: day.gc.d };
    case "ec-monthly":
      return { kind: "ec-monthday", day: day.ec.d };
    case "once":
    default:
      return null;
  }
};
