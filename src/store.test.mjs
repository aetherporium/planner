import { describe, it, expect, beforeEach } from "vitest";
import {
  createStore, makeTask, taskLoad, totalLoad, asTree, asLayers,
  subtreeLoad, tasksFor, __resetIds, formatLoad,
} from "./store.mjs";

beforeEach(() => __resetIds());

describe("Task", () => {
  it("requires a known frequency", () => {
    expect(() => makeTask({ title: "x", frequency: "hourly" })).toThrow(/Unknown frequency/);
  });
  it("rejects negative duration", () => {
    expect(() => makeTask({ title: "x", duration: -5 })).toThrow(/non-negative/);
  });
  it("computes weekly Load from frequency and duration", () => {
    expect(taskLoad(makeTask({ title: "a", frequency: "daily", duration: 15 }))).toBe(105);
    expect(taskLoad(makeTask({ title: "b", frequency: "weekly", duration: 90 }))).toBe(90);
    expect(taskLoad(makeTask({ title: "c", frequency: "once", duration: 300 }))).toBe(0);
  });
  it("makes a daily 15m Task a heavier commitment than a monthly 90m one", () => {
    const daily = makeTask({ title: "d", frequency: "daily", duration: 15 });
    const monthly = makeTask({ title: "m", frequency: "monthly", duration: 90 });
    expect(taskLoad(daily)).toBeGreaterThan(taskLoad(monthly));
  });
});

describe("CRUD", () => {
  it("adds, modifies and removes a Task", () => {
    const s = createStore();
    const p = s.addPage("Week");
    const t = s.addTask({ title: "Run", frequency: "daily", duration: 30, pageId: p.id });
    expect(tasksFor(s.get())).toHaveLength(1);
    s.updateTask(t.id, { duration: 45 });
    expect(tasksFor(s.get())[0].duration).toBe(45);
    s.removeTask(t.id);
    expect(tasksFor(s.get())).toHaveLength(0);
  });

  it("removing a parent removes its descendants", () => {
    const s = createStore();
    const p = s.addPage("W");
    const parent = s.addTask({ title: "Ship", pageId: p.id });
    const child = s.addTask({ title: "Sub", parentId: parent.id, pageId: p.id });
    s.addTask({ title: "Grandchild", parentId: child.id, pageId: p.id });
    s.removeTask(parent.id);
    expect(s.get().tasks).toHaveLength(0);
  });

  it("removing a Task clears dangling dependency links", () => {
    const s = createStore();
    const p = s.addPage("W");
    const a = s.addTask({ title: "A", pageId: p.id });
    const b = s.addTask({ title: "B", dependsOn: [a.id], pageId: p.id });
    s.removeTask(a.id);
    expect(s.get().tasks.find((t) => t.id === b.id).dependsOn).toEqual([]);
  });

  it("removing a Page removes its Tasks", () => {
    const s = createStore();
    const p = s.addPage("Gone");
    s.addTask({ title: "x", pageId: p.id });
    s.removePage(p.id);
    expect(s.get().tasks).toHaveLength(0);
  });
});

describe("Branching", () => {
  it("forking copies Tasks without touching the source branch", () => {
    const s = createStore();
    const p = s.addPage("W");
    s.addTask({ title: "Original", duration: 30, pageId: p.id });
    const main = tasksFor(s.get()).length;
    s.forkBranch("Ambitious");
    s.updateTask(tasksFor(s.get())[0].id, { duration: 120 });
    s.selectBranch("main");
    expect(tasksFor(s.get())).toHaveLength(main);
    expect(tasksFor(s.get())[0].duration).toBe(30);
  });

  it("forking re-points parent links at the copies, not the originals", () => {
    const s = createStore();
    const p = s.addPage("W");
    const parent = s.addTask({ title: "P", pageId: p.id });
    s.addTask({ title: "C", parentId: parent.id, pageId: p.id });
    const fork = s.forkBranch("Alt");
    const copies = tasksFor(s.get(), { branchId: fork.id });
    const copiedChild = copies.find((t) => t.parentId !== null);
    expect(copies.some((t) => t.id === copiedChild.parentId)).toBe(true);
    expect(copiedChild.parentId).not.toBe(parent.id);
  });

  it("branches can carry different Load for comparison", () => {
    const s = createStore();
    const p = s.addPage("W");
    s.addTask({ title: "T", frequency: "daily", duration: 10, pageId: p.id });
    const baseline = totalLoad(tasksFor(s.get()));
    s.forkBranch("Heavy");
    s.updateTask(tasksFor(s.get())[0].id, { duration: 60 });
    expect(totalLoad(tasksFor(s.get()))).toBeGreaterThan(baseline);
  });
});

describe("View projections", () => {
  it("nests Tasks into a tree and rolls Load up", () => {
    const s = createStore();
    const p = s.addPage("W");
    const parent = s.addTask({ title: "P", frequency: "weekly", duration: 10, pageId: p.id });
    s.addTask({ title: "C", frequency: "weekly", duration: 20, parentId: parent.id, pageId: p.id });
    const roots = asTree(tasksFor(s.get()));
    expect(roots).toHaveLength(1);
    expect(subtreeLoad(roots[0])).toBe(30);
  });

  it("layers Tasks by dependency depth", () => {
    const s = createStore();
    const p = s.addPage("W");
    const a = s.addTask({ title: "A", pageId: p.id });
    const b = s.addTask({ title: "B", dependsOn: [a.id], pageId: p.id });
    s.addTask({ title: "C", dependsOn: [b.id], pageId: p.id });
    s.addTask({ title: "Parallel", pageId: p.id });
    const layers = asLayers(tasksFor(s.get()));
    expect(layers).toHaveLength(3);
    expect(layers[0].map((t) => t.title).sort()).toEqual(["A", "Parallel"]);
  });

  it("survives a dependency cycle instead of hanging", () => {
    const s = createStore();
    const p = s.addPage("W");
    const a = s.addTask({ title: "A", pageId: p.id });
    const b = s.addTask({ title: "B", dependsOn: [a.id], pageId: p.id });
    s.updateTask(a.id, { dependsOn: [b.id] });
    expect(() => asLayers(tasksFor(s.get()))).not.toThrow();
  });

  it("every View reads the same Tasks — swapping View never changes data", () => {
    const s = createStore();
    const p = s.addPage("W");
    const a = s.addTask({ title: "A", pageId: p.id });
    s.addTask({ title: "B", parentId: a.id, pageId: p.id });
    s.addTask({ title: "C", dependsOn: [a.id], pageId: p.id });
    const tasks = tasksFor(s.get());
    const inTree = (n) => 1 + n.children.reduce((s2, c) => s2 + inTree(c), 0);
    expect(asTree(tasks).reduce((s2, r) => s2 + inTree(r), 0)).toBe(tasks.length);
    expect(asLayers(tasks).flat()).toHaveLength(tasks.length);
  });
});

describe("formatLoad", () => {
  it("renders a dash for no commitment", () => expect(formatLoad(0)).toBe("—"));
  it("renders minutes under an hour", () => expect(formatLoad(45)).toBe("45m/wk"));
  it("renders hours above", () => expect(formatLoad(150)).toBe("2.5h/wk"));
});
