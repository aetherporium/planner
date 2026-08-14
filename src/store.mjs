/**
 * Planner store — the pure module.
 *
 * No DOM, no globals, no framework. The prototype page is a thin shell over
 * this; whichever variant wins, THIS is what lifts into production.
 *
 * Every name comes from CONTEXT.md.
 */

export const FREQUENCIES = ["once", "daily", "weekly", "monthly"];

/** Occurrences per week, per CONTEXT.md's Load table. */
const PER_WEEK = { once: 0, daily: 7, weekly: 1, monthly: 12 / 52 };

let seq = 0;
const nextId = (prefix) => `${prefix}${++seq}`;

/** Reset id sequence — test hook only. */
export const __resetIds = () => {
  seq = 0;
};

// ── Task ────────────────────────────────────────────────────────────────────

export const makeTask = ({
  title,
  frequency = "weekly",
  duration = 30,
  parentId = null,
  branchId = "main",
  dependsOn = [],
  done = false,
}) => {
  if (!FREQUENCIES.includes(frequency)) {
    throw new Error(`Unknown frequency: ${frequency}`);
  }
  if (!Number.isFinite(duration) || duration < 0) {
    throw new Error(`Duration must be a non-negative number, got: ${duration}`);
  }
  return {
    id: nextId("t"),
    title,
    frequency,
    duration,
    parentId,
    branchId,
    dependsOn,
    done,
  };
};

/** Weekly Load in minutes for one Task. */
export const taskLoad = (task) => task.duration * PER_WEEK[task.frequency];

/** Weekly Load for a set of Tasks. */
export const totalLoad = (tasks) => tasks.reduce((sum, t) => sum + taskLoad(t), 0);

export const formatLoad = (minutes) => {
  if (minutes <= 0) return "—";
  if (minutes < 60) return `${Math.round(minutes)}m/wk`;
  const hours = minutes / 60;
  return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)}h/wk`;
};

// ── Store ───────────────────────────────────────────────────────────────────

export const createStore = (initial = {}) => {
  let state = {
    pages: initial.pages ?? [],
    tasks: initial.tasks ?? [],
    activePageId: initial.activePageId ?? null,
    activeBranchId: initial.activeBranchId ?? "main",
    branches: initial.branches ?? [{ id: "main", name: "Main plan", basedOn: null }],
  };

  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => fn(state));

  const api = {
    get: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    // ── Pages ──
    addPage(name) {
      const page = { id: nextId("p"), name };
      state = { ...state, pages: [...state.pages, page], activePageId: page.id };
      emit();
      return page;
    },
    renamePage(id, name) {
      state = {
        ...state,
        pages: state.pages.map((p) => (p.id === id ? { ...p, name } : p)),
      };
      emit();
    },
    removePage(id) {
      const pages = state.pages.filter((p) => p.id !== id);
      state = {
        ...state,
        pages,
        tasks: state.tasks.filter((t) => t.pageId !== id),
        activePageId: state.activePageId === id ? (pages[0]?.id ?? null) : state.activePageId,
      };
      emit();
    },
    selectPage(id) {
      state = { ...state, activePageId: id };
      emit();
    },

    // ── Tasks ──
    addTask(fields) {
      const task = { ...makeTask({ ...fields, branchId: state.activeBranchId }), pageId: fields.pageId ?? state.activePageId };
      state = { ...state, tasks: [...state.tasks, task] };
      emit();
      return task;
    },
    updateTask(id, patch) {
      if (patch.frequency && !FREQUENCIES.includes(patch.frequency)) {
        throw new Error(`Unknown frequency: ${patch.frequency}`);
      }
      state = {
        ...state,
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      };
      emit();
    },
    /** Removing a Task removes its descendants — an orphaned subtree is a bug. */
    removeTask(id) {
      const doomed = new Set([id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const t of state.tasks) {
          if (t.parentId && doomed.has(t.parentId) && !doomed.has(t.id)) {
            doomed.add(t.id);
            grew = true;
          }
        }
      }
      state = {
        ...state,
        tasks: state.tasks
          .filter((t) => !doomed.has(t.id))
          .map((t) => ({ ...t, dependsOn: t.dependsOn.filter((d) => !doomed.has(d)) })),
      };
      emit();
    },
    toggleTask(id) {
      state = {
        ...state,
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
      };
      emit();
    },

    // ── Branches ──
    /** Fork the active branch: copy its Tasks under a new branch id. */
    forkBranch(name) {
      const branch = { id: nextId("b"), name, basedOn: state.activeBranchId };
      const idMap = new Map();
      const source = state.tasks.filter((t) => t.branchId === state.activeBranchId);
      const copies = source.map((t) => {
        const copy = { ...t, id: nextId("t"), branchId: branch.id };
        idMap.set(t.id, copy.id);
        return copy;
      });
      // Re-point parent and dependency links at the copies.
      for (const c of copies) {
        if (c.parentId && idMap.has(c.parentId)) c.parentId = idMap.get(c.parentId);
        c.dependsOn = c.dependsOn.map((d) => idMap.get(d) ?? d);
      }
      state = {
        ...state,
        branches: [...state.branches, branch],
        tasks: [...state.tasks, ...copies],
        activeBranchId: branch.id,
      };
      emit();
      return branch;
    },
    selectBranch(id) {
      state = { ...state, activeBranchId: id };
      emit();
    },
  };

  return api;
};

// ── Selectors ───────────────────────────────────────────────────────────────

export const tasksFor = (state, { pageId, branchId } = {}) =>
  state.tasks.filter(
    (t) =>
      t.pageId === (pageId ?? state.activePageId) &&
      t.branchId === (branchId ?? state.activeBranchId),
  );

/** Nest a flat Task list into a tree via parentId. */
export const asTree = (tasks) => {
  const byId = new Map(tasks.map((t) => [t.id, { ...t, children: [] }]));
  const roots = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
};

/** Rolled-up Load: a Task's own Load plus all descendants'. */
export const subtreeLoad = (node) =>
  taskLoad(node) + node.children.reduce((sum, c) => sum + subtreeLoad(c), 0);

/**
 * Layer Tasks into dependency columns. Tasks with no unmet dependency sit in
 * layer 0; each dependency pushes a Task one layer right. Cycles are dropped
 * into the final layer rather than hanging the renderer.
 */
export const asLayers = (tasks) => {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const depth = new Map();
  const visiting = new Set();

  const depthOf = (task) => {
    if (depth.has(task.id)) return depth.get(task.id);
    if (visiting.has(task.id)) return 0; // cycle guard
    visiting.add(task.id);
    const deps = task.dependsOn.map((d) => byId.get(d)).filter(Boolean);
    const d = deps.length ? Math.max(...deps.map((x) => depthOf(x) + 1)) : 0;
    visiting.delete(task.id);
    depth.set(task.id, d);
    return d;
  };

  for (const t of tasks) depthOf(t);
  const max = Math.max(0, ...depth.values());
  const layers = Array.from({ length: max + 1 }, () => []);
  for (const t of tasks) layers[depth.get(t.id)].push(t);
  return layers;
};
