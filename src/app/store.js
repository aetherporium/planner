/**
 * App state on top of the pure modules in src/.
 *
 * NOTHING IS SEEDED. The only tasks that exist on a fresh install are the five
 * always-on defaults (wake, breakfast, lunch, dinner, sleep), which are part of
 * the product, not fabricated history. There are no invented log entries: an
 * empty day shows an empty day.
 */

import { useMemo, useCallback } from "react";
import { dayFromJdn, gcToJdn, addDays } from "../calendar.mjs";
import { buildDefaults } from "../defaults.mjs";
import { firesOn, describeRule } from "../blueprint.mjs";
import { STATUS, makeEntry, statusOf, timelineWithGaps } from "../log.mjs";
import { usePersisted } from "./hooks.js";

/** Real wall-clock now, as (jdn, minutes, seconds). */
export const readNow = () => {
  const d = new Date();
  return {
    jdn: gcToJdn(d.getFullYear(), d.getMonth() + 1, d.getDate()),
    minutes: d.getHours() * 60 + d.getMinutes(),
    seconds: d.getSeconds(),
    ms: d.getMilliseconds(),
  };
};

/** The blueprints a task can belong to. Each is its own page. */
export const RULES = [
  { id: "everyday", rule: { kind: "everyday" } },
  { id: "weekday", rule: { kind: "weekday" } },
  { id: "weekend", rule: { kind: "weekend" } },
  { id: "dow1", rule: { kind: "dow", dow: 1 } },
  { id: "dow5", rule: { kind: "dow", dow: 5 } },
  { id: "dow0", rule: { kind: "dow", dow: 0 } },
  { id: "gc1", rule: { kind: "gc-monthday", day: 1 } },
  { id: "ec1", rule: { kind: "ec-monthday", day: 1 } },
  { id: "holiday", rule: { kind: "holiday" } },
];

export const ruleIdOf = (rule) => {
  if (!rule) return null;
  switch (rule.kind) {
    case "everyday": return "everyday";
    case "weekday": return "weekday";
    case "weekend": return "weekend";
    case "dow": return `dow${rule.dow}`;
    case "gc-monthday": return rule.day === 1 ? "gc1" : `gcd${rule.day}`;
    case "ec-monthday": return rule.day === 1 ? "ec1" : `ecd${rule.day}`;
    case "holiday": return "holiday";
    default: return null;
  }
};

export const ruleById = (id) => {
  const known = RULES.find((r) => r.id === id);
  if (known) return known.rule;
  let m = /^dow(\d)$/.exec(id);
  if (m) return { kind: "dow", dow: Number(m[1]) };
  m = /^gcd(\d+)$/.exec(id);
  if (m) return { kind: "gc-monthday", day: Number(m[1]) };
  m = /^ecd(\d+)$/.exec(id);
  if (m) return { kind: "ec-monthday", day: Number(m[1]) };
  return null;
};

export const ruleLabel = (id) => {
  const r = ruleById(id);
  return r ? describeRule(r) : "Unknown";
};

let seq = 0;
const newId = () => `t${Date.now().toString(36)}${(seq++).toString(36)}`;

export const usePlanner = () => {
  // User-created blueprint tasks. Empty until the user adds one.
  const [userTasks, setUserTasks] = usePersisted("planner:tasks", []);
  // Log entries — reality. Empty until the user records something.
  const [entries, setEntries] = usePersisted("planner:entries", []);
  // Defaults the user explicitly turned off. They stay visible, marked off.
  const [disabled, setDisabled] = usePersisted("planner:disabled", []);
  // The user's own groupings. Empty until they make one.
  const [categories, setCategories] = usePersisted("planner:categories", []);

  // Defaults are product, not user data, so their category lives separately.
  const [defaultCats, setDefaultCats] = usePersisted("planner:defaultCats", {});

  const allTasks = useMemo(
    () => [
      ...buildDefaults(new Set(disabled)).map((t) => ({ ...t, categoryId: defaultCats[t.id] ?? null })),
      ...userTasks,
    ],
    [disabled, userTasks, defaultCats],
  );

  const day = useCallback((jdn) => dayFromJdn(jdn), []);

  /** Blueprint tasks that fire on a day, in planned order. */
  const tasksFor = useCallback(
    (jdn) => {
      const d = dayFromJdn(jdn);
      return allTasks
        .filter((t) => t.enabled !== false)
        .filter((t) => (t.rule ? firesOn(t.rule, d) : t.dates?.includes(d.iso)))
        .sort((a, b) => (a.startMin ?? 0) - (b.startMin ?? 0));
    },
    [allTasks],
  );

  /** Planned tasks plus their gaps — the continuous 24h day. */
  const timelineFor = useCallback(
    (jdn) => timelineWithGaps(tasksFor(jdn), { dayStartMin: 0, dayEndMin: 1440 }),
    [tasksFor],
  );

  const statusFor = useCallback(
    (taskId, jdn) => statusOf(entries, taskId, jdn),
    [entries],
  );

  const log = useCallback(
    (payload, now) => {
      const existing = statusOf(entries, payload.taskId, payload.dayJdn);
      // Re-choosing the status you already set clears it — back to blank.
      // Blank is "no information", and the user can always return to it.
      if (existing && existing.status === payload.status && !payload.force) {
        setEntries((es) => es.filter((e) => e.id !== existing.id));
        return null;
      }
      const entry = makeEntry(payload, now ?? readNow());
      setEntries((es) => [...es.filter((e) => e.id !== existing?.id), entry]);
      return entry;
    },
    [entries, setEntries],
  );

  const addTask = useCallback(
    (task) => {
      const t = { ...task, id: newId() };
      setUserTasks((ts) => [...ts, t]);
      return t;
    },
    [setUserTasks],
  );

  const updateTask = useCallback(
    (id, patch) => setUserTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    [setUserTasks],
  );

  const removeTask = useCallback(
    (id) => {
      setUserTasks((ts) => ts.filter((t) => t.id !== id));
      setEntries((es) => es.filter((e) => e.taskId !== id));
    },
    [setUserTasks, setEntries],
  );

  const toggleDefault = useCallback(
    (key) =>
      setDisabled((ds) => (ds.includes(key) ? ds.filter((k) => k !== key) : [...ds, key])),
    [setDisabled],
  );

  const findTask = useCallback((id) => allTasks.find((t) => t.id === id) ?? null, [allTasks]);

  // ── Categories: authored groupings, unlike patterns which are observed ──

  const addCategory = useCallback(
    ({ name, color }) => {
      const c = { id: `c${Date.now().toString(36)}${(seq++).toString(36)}`, name, color };
      setCategories((cs) => [...cs, c]);
      return c;
    },
    [setCategories],
  );

  const updateCategory = useCallback(
    (id, patch) => setCategories((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c))),
    [setCategories],
  );

  /** Deleting a category never deletes its tasks — they just come loose. */
  const removeCategory = useCallback(
    (id) => {
      setCategories((cs) => cs.filter((c) => c.id !== id));
      setUserTasks((ts) => ts.map((t) => (t.categoryId === id ? { ...t, categoryId: null } : t)));
      setDefaultCats((m) => {
        const next = { ...m };
        for (const k of Object.keys(next)) if (next[k] === id) delete next[k];
        return next;
      });
    },
    [setCategories, setUserTasks, setDefaultCats],
  );

  const setCategory = useCallback(
    (taskId, categoryId) => {
      if (String(taskId).startsWith("default:")) {
        setDefaultCats((m) => ({ ...m, [taskId]: categoryId }));
      } else {
        setUserTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, categoryId } : t)));
      }
    },
    [setUserTasks, setDefaultCats],
  );

  return {
    allTasks,
    userTasks,
    entries,
    disabled,
    categories,
    addCategory,
    updateCategory,
    removeCategory,
    setCategory,
    day,
    tasksFor,
    timelineFor,
    statusFor,
    log,
    addTask,
    updateTask,
    removeTask,
    toggleDefault,
    findTask,
    addDays,
    STATUS,
  };
};
