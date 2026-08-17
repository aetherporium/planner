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
import { fromDawn, toClock } from "./format.js";

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

export const DEFAULT_SETTINGS = {
  dayStart: "dawn",        // dawn | midnight — where the timeline is anchored
  showSeconds: true,
  showWater: true,
  gapThreshold: 20,        // minutes; below this a gap is noise, not rest
  neighbourDays: true,     // yesterday and tomorrow in the same timeline
  pastCount: 2,
  futureCount: 3,
  confirmDayChange: true,  // scrolling into a neighbour asks before switching
  prototypeMode: false,    // show unfinished design work inside the app
  zoom: 1,                 // timeline detail: 0.5 = whole day, 3 = minute-level
  calView: "grid",         // grid | list — which shape the calendar opens in
};

/**
 * DEMO CONTENT — only ever loaded when the user asks for it from Settings.
 * Nothing here is shown by default; a fresh install has five defaults and
 * nothing else.
 */
const DEMO_CATEGORIES = [
  { name: "School", color: "#2c6fb5", icon: "book" },
  { name: "Home", color: "#2f8f74", icon: "home" },
  { name: "Work", color: "#6b4fc4", icon: "work" },
  { name: "Health", color: "#b23b57", icon: "heart" },
  { name: "Errands", color: "#b5761f", icon: "cart" },
  { name: "Music", color: "#b04b8a", icon: "music" },
];

const DEMO_TASKS = [
  { title: "Morning prayer", startMin: 6 * 60 + 10, duration: 20, rule: { kind: "everyday" }, place: "Home", cat: "Home" },
  { title: "Commute to school", startMin: 7 * 60 + 40, duration: 35, rule: { kind: "weekday" }, place: "Bus", cat: "School" },
  { title: "Maths", startMin: 8 * 60 + 30, duration: 90, rule: { kind: "weekday" }, place: "School", cat: "School" },
  { title: "Physics", startMin: 10 * 60 + 15, duration: 60, rule: { kind: "weekday" }, place: "School", cat: "School" },
  { title: "Library reading", startMin: 14 * 60, duration: 75, rule: { kind: "weekday" }, place: "School", cat: "School" },
  { title: "Football", startMin: 16 * 60 + 30, duration: 90, rule: { kind: "dow", dow: 2 }, place: "Field", cat: "Health" },
  { title: "Run", startMin: 6 * 60 + 40, duration: 40, rule: { kind: "dow", dow: 4 }, place: "Park", cat: "Health" },
  { title: "Guitar practice", startMin: 17 * 60, duration: 45, rule: { kind: "dow", dow: 0 }, place: "Home", cat: "Music" },
  { title: "Choir", startMin: 9 * 60, duration: 120, rule: { kind: "dow", dow: 0 }, place: "Church", cat: "Music" },
  { title: "Market", startMin: 9 * 60 + 30, duration: 80, rule: { kind: "weekend" }, place: "Market", cat: "Errands" },
  { title: "Laundry", startMin: 13 * 60, duration: 60, rule: { kind: "weekend" }, place: "Home", cat: "Home" },
  { title: "Clean the house", startMin: 15 * 60, duration: 90, rule: { kind: "dow", dow: 6 }, place: "Home", cat: "Home" },
  { title: "Pay rent", startMin: 10 * 60, duration: 30, rule: { kind: "gc-monthday", day: 1 }, place: "Bank", cat: "Errands" },
  { title: "Budget review", startMin: 20 * 60, duration: 45, rule: { kind: "ec-monthday", day: 1 }, place: "Home", cat: "Work" },
  { title: "Team standup", startMin: 9 * 60 + 15, duration: 15, rule: { kind: "weekday" }, place: "Office", cat: "Work" },
  { title: "Deep work", startMin: 11 * 60 + 30, duration: 120, rule: { kind: "weekday" }, place: "Office", cat: "Work" },
  { title: "Call home", startMin: 21 * 60, duration: 25, rule: { kind: "dow", dow: 5 }, place: "Home", cat: "Home" },
  { title: "Holiday meal", startMin: 13 * 60, duration: 150, rule: { kind: "holiday" }, place: "Home", cat: "Home" },
  { title: "Stretch", startMin: 6 * 60 + 5, duration: 0, rule: { kind: "everyday" }, place: "Home", cat: "Health" },
  { title: "Water plants", startMin: 18 * 60 + 30, duration: 15, rule: { kind: "dow", dow: 3 }, place: "Home", cat: "Home" },
  { title: "Gym", startMin: 17 * 60 + 30, duration: 75, rule: { kind: "dow", dow: 1 }, place: "Gym", cat: "Health",
    kind: "checklist",
    items: ["Warm up 10 min", "Squat 3x8", "Bench 3x8", "Row 3x10", "Plank 3x1 min", "Stretch"] },
];

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
  // Preferences. Defaults are the product's opinion, not fabricated user data.
  const [settings, setSettings] = usePersisted("planner:settings", DEFAULT_SETTINGS);

  // Defaults are product, not user data, so their category lives separately.
  const [defaultCats, setDefaultCats] = usePersisted("planner:defaultCats", {});
  // Defaults are rebuilt from code each load, so their per-date exceptions
  // and edits have to be kept beside them rather than on them.
  const [defaultBlocks, setDefaultBlocks] = usePersisted("planner:defaultBlocks", {});
  const [defaultEdits, setDefaultEdits] = usePersisted("planner:defaultEdits", {});

  const allTasks = useMemo(
    () => [
      ...buildDefaults(new Set(disabled)).map((t) => ({
        ...t,
        ...(defaultEdits[t.id] ?? null),
        categoryId: defaultCats[t.id] ?? null,
        blocked: defaultBlocks[t.id] ?? [],
      })),
      ...userTasks,
    ],
    [disabled, userTasks, defaultCats, defaultBlocks, defaultEdits],
  );

  const day = useCallback((jdn) => dayFromJdn(jdn), []);

  /** Blueprint tasks that fire on a day, in planned order. */
  const tasksFor = useCallback(
    (jdn) => {
      const d = dayFromJdn(jdn);
      return allTasks
        .filter((t) => t.enabled !== false)
        .filter((t) => (t.rule ? firesOn(t.rule, d) : t.dates?.includes(d.iso)))
        // A blocked date is an exception to the pattern: the task repeats as
        // before, just not on that day. Skipping one Tuesday should not mean
        // rewriting what "every Tuesday" means.
        .filter((t) => !t.blocked?.includes(d.iso))
        .sort((a, b) => (a.startMin ?? 0) - (b.startMin ?? 0));
    },
    [allTasks],
  );

  /** Planned tasks plus their gaps — the continuous 24h day. */
  // The day runs dawn to dawn, so a 22:30 sleep of 450 minutes ends exactly at
  // the day's edge instead of overflowing past it.
  const timelineFor = useCallback(
    (jdn) => {
      /*
       * Slots are clock times like everything else, so they have to be moved
       * onto the dawn axis with the task's own start. Left alone they were
       * read as if already dawn-relative, which pushed every sip six hours
       * late — the last one landed at 2am, in the middle of sleep.
       */
      const shifted = tasksFor(jdn).map((t) => ({
        ...t,
        startMin: fromDawn(t.startMin),
        ...(Array.isArray(t.slots) ? { slots: t.slots.map(fromDawn) } : null),
      }));
      return timelineWithGaps(shifted, { dayStartMin: 0, dayEndMin: 1440 }).map((it) =>
        it.kind === "task" ? { ...it, task: { ...it.task, startMin: toClock(it.task.startMin) } } : it,
      );
    },
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
    (id, patch) => {
      // A default is not in userTasks, so editing one is recorded as an
      // override keyed by its id instead of mutating a list it is not in.
      if (buildDefaults(new Set()).some((t) => t.id === id)) {
        setDefaultEdits((m) => ({ ...m, [id]: { ...(m[id] ?? null), ...patch } }));
        return;
      }
      setUserTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    },
    [setUserTasks, setDefaultEdits],
  );

  const removeTask = useCallback(
    (id) => {
      setUserTasks((ts) => ts.filter((t) => t.id !== id));
      setEntries((es) => es.filter((e) => e.taskId !== id));
    },
    [setUserTasks, setEntries],
  );

  /**
   * Block or unblock a single date on a repeating task.
   *
   * Defaults are rebuilt from code on every load and so cannot carry state of
   * their own; their overrides live in a keyed map instead, merged in above.
   */
  const toggleBlocked = useCallback(
    (id, iso) => {
      const flip = (list = []) =>
        list.includes(iso) ? list.filter((x) => x !== iso) : [...list, iso];
      const isDefault = buildDefaults(new Set()).some((t) => t.id === id);
      if (isDefault) {
        setDefaultBlocks((m) => ({ ...m, [id]: flip(m[id]) }));
      } else {
        setUserTasks((ts) => ts.map((t) => (t.id === id ? { ...t, blocked: flip(t.blocked) } : t)));
      }
    },
    [setUserTasks, setDefaultBlocks],
  );

  const toggleDefault = useCallback(
    (key) =>
      setDisabled((ds) => (ds.includes(key) ? ds.filter((k) => k !== key) : [...ds, key])),
    [setDisabled],
  );

  const findTask = useCallback((id) => allTasks.find((t) => t.id === id) ?? null, [allTasks]);

  /**
   * Record a measured amount. Unlike a status, this REPLACES rather than
   * appends — "1400 ml" is a running total, not an event, so a day has one
   * of them and re-recording corrects it.
   */
  const setAmount = useCallback(
    (taskId, dayJdn, amount, now) => {
      setEntries((es) => {
        const rest = es.filter((e) => !(e.taskId === taskId && e.dayJdn === dayJdn));
        const prev = es.find((e) => e.taskId === taskId && e.dayJdn === dayJdn);
        const value = Math.max(0, Math.round(amount));
        if (!value) return rest;
        return [
          ...rest,
          makeEntry(
            {
              taskId,
              dayJdn,
              status: STATUS.DONE,
              amount: value,
              checked: prev?.checked ?? null,
            },
            now,
          ),
        ];
      });
    },
    [setEntries],
  );

  /** Tick or untick one checklist item. */
  const toggleItem = useCallback(
    (taskId, dayJdn, item, now) => {
      setEntries((es) => {
        const prev = es.find((e) => e.taskId === taskId && e.dayJdn === dayJdn);
        const had = prev?.checked ?? [];
        const checked = had.includes(item) ? had.filter((i) => i !== item) : [...had, item];
        const rest = es.filter((e) => !(e.taskId === taskId && e.dayJdn === dayJdn));
        if (!checked.length) return rest;
        return [
          ...rest,
          makeEntry(
            { taskId, dayJdn, status: STATUS.DONE, checked, amount: prev?.amount ?? null },
            now,
          ),
        ];
      });
    },
    [setEntries],
  );

  const setSetting = useCallback(
    (key, value) => setSettings((s0) => ({ ...s0, [key]: value })),
    [setSettings],
  );

  /**
   * Load a demo day so the layout can be judged against real density.
   * Explicitly user-triggered and clearly labelled — it is never seeded, and
   * never appears unless asked for. See ADR-0007.
   */
  const loadDemo = useCallback(() => {
    const cats = DEMO_CATEGORIES.map((c) => ({
      ...c,
      id: `c${Date.now().toString(36)}${(seq++).toString(36)}`,
    }));
    const byName = Object.fromEntries(cats.map((c) => [c.name, c.id]));
    setCategories(cats);
    setUserTasks(
      DEMO_TASKS.map((t) => ({
        ...t,
        id: `t${Date.now().toString(36)}${(seq++).toString(36)}`,
        categoryId: t.cat ? byName[t.cat] : null,
      })),
    );
  }, [setCategories, setUserTasks]);

  const clearAll = useCallback(() => {
    setUserTasks([]);
    setCategories([]);
    setEntries([]);
    setDefaultCats({});
  }, [setUserTasks, setCategories, setEntries, setDefaultCats]);

  // ── Categories: authored groupings, unlike patterns which are observed ──

  const addCategory = useCallback(
    ({ name, color, icon = null }) => {
      const c = { id: `c${Date.now().toString(36)}${(seq++).toString(36)}`, name, color, icon };
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
    setAmount,
    toggleItem,
    settings,
    setSetting,
    loadDemo,
    clearAll,
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
    toggleBlocked,
    toggleDefault,
    findTask,
    addDays,
    STATUS,
  };
};
