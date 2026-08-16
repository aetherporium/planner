/**
 * Blueprints — every task you have, with its information, and the settings
 * that shape it.
 *
 * Split horizontally: the top half is the shelves (patterns, then categories),
 * the bottom half is the full list of tasks. Patterns are derived
 * automatically and categories are optional, so neither is required to use
 * this page — the list below always works.
 */

import { useMemo, useState } from "react";
import Icon from "./Icon.jsx";
import Popup from "./Popup.jsx";
import { Time } from "./Mark.jsx";
import { fromDawn } from "./format.js";
import { patternsIn, categorise, colorOf, iconOf, patternName } from "../patterns.mjs";
import { fmtDur, isMoment } from "../log.mjs";
import CategoryForm from "./CategoryForm.jsx";

export default function Blueprints({ planner, now, Top, theme, onToggle }) {
  const recurring = planner.allTasks.filter((t) => t.rule);
  const patterns = useMemo(() => patternsIn(recurring), [recurring]);
  const { groups, loose } = useMemo(
    () => categorise(planner.allTasks, planner.categories),
    [planner.allTasks, planner.categories],
  );

  const [open, setOpen] = useState(null);   // {kind:'pattern'|'category', id}
  const [making, setMaking] = useState(false);
  const [editing, setEditing] = useState(null);
  const [sort, setSort] = useState("time");

  const pattern = open?.kind === "pattern" ? patterns.find((p) => p.id === open.id) : null;
  const category = open?.kind === "category" ? groups.find((c) => c.id === open.id) : null;

  const tasks = useMemo(() => {
    const all = [...planner.allTasks];
    if (sort === "name") return all.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "length") return all.sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0));
    return all.sort((a, b) => fromDawn(a.startMin ?? 0) - fromDawn(b.startMin ?? 0));
  }, [planner.allTasks, sort]);

  const catOf = (t) => planner.categories.find((c) => c.id === t.categoryId) ?? null;

  const slot = (t) => (
    <a key={t.id} className={`slot${t.enabled === false ? " off" : ""}`} href={`#/task/${t.id}/${now.jdn}`}>
      <span className="slot-t"><Time min={t.startMin} size={6} /></span>
      {isMoment(t) ? (
        <span className="slot-moment" />
      ) : (
        <span className="slot-bar" style={{ "--w": Math.min(100, (t.duration ?? 0) / 4.5) }} />
      )}
      <span className="slot-n">{t.title}</span>
      <span className="slot-d">
        {t.enabled === false ? "off" : isMoment(t) ? "moment" : fmtDur(t.duration ?? 0)}
      </span>
    </a>
  );

  return (
    <div className="page">
      <Top back={{ href: "#/", label: "Today" }} theme={theme} onToggle={onToggle} />

      <div className="bp-hero">
        <h1 className="title">Blueprints</h1>
        <div className="btnrow">
          <a className="btn" href="#/settings">
            <Icon name="settings" size={15} />
            Settings
          </a>
          <a className="bp-add" href={`#/day/${now.jdn}/add`}>
            <Icon name="plus" size={18} />
            <span>
              <strong>New task</strong>
              <small>Plan something you do</small>
            </span>
          </a>
        </div>
      </div>

      {/* ── top half: the shelves ── */}
      <div className="bp-top">
        {patterns.length ? (
          <section className="shelf">
            <h2 className="section centered">Patterns</h2>
            <p className="shelf-note">Found in your tasks — you never make these.</p>
            <div className="card-strip">
              {patterns.map((p) => (
                <button key={p.id} className="sq" onClick={() => setOpen({ kind: "pattern", id: p.id })}>
                  <Icon name="pattern" size={17} className="sq-i" />
                  <span className="sq-n">{p.name}</span>
                  <span className="sq-c">{p.cadence}</span>
                  <span className="sq-k">{p.tasks.length} task{p.tasks.length === 1 ? "" : "s"}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="shelf">
          <h2 className="section centered">Categories</h2>
          <p className="shelf-note">Optional. Group tasks however you like.</p>
          <div className="card-strip">
            <button className="sq sq-new" onClick={() => setMaking(true)} aria-label="New category" title="New category">
              <Icon name="plus" size={22} />
            </button>
            {groups.map((c) => (
              <button
                key={c.id}
                className="sq sq-cat"
                style={{ "--c": colorOf(c.color) }}
                onClick={() => setOpen({ kind: "category", id: c.id })}
              >
                <span className="sq-badge"><Icon name={iconOf(c.icon)} size={16} /></span>
                <span className="sq-n">{c.name}</span>
                <span className="sq-c">{c.tasks.length} task{c.tasks.length === 1 ? "" : "s"}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* ── bottom half: every task, with its information ── */}
      <div className="bp-bottom">
        <div className="bp-list-head">
          <h2 className="section" style={{ margin: 0 }}>
            All tasks <span className="dim">({tasks.length})</span>
          </h2>
          <div className="seg">
            {[["time", "Time"], ["name", "Name"], ["length", "Length"]].map(([k, label]) => (
              <button key={k} className={sort === k ? "on" : ""} onClick={() => setSort(k)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="tbl">
          {tasks.map((t) => {
            const c = catOf(t);
            return (
              <a key={t.id} className={`trow${t.enabled === false ? " off" : ""}`} href={`#/task/${t.id}/${now.jdn}`}>
                <span className="tc-time"><Time min={t.startMin} size={6} /></span>
                <span className="tc-name">
                  {t.title}
                  {t.isDefault ? <span className="tag">default</span> : null}
                </span>
                <span className="tc-dur">{isMoment(t) ? "moment" : fmtDur(t.duration ?? 0)}</span>
                <span className="tc-pat">{t.rule ? patternName(t.rule) : "Once"}</span>
                <span className="tc-cat">
                  {c ? (
                    <span className="pill" style={{ "--c": colorOf(c.color) }}>
                      <Icon name={iconOf(c.icon)} size={11} />
                      {c.name}
                    </span>
                  ) : (
                    <span className="dim">—</span>
                  )}
                </span>
                <span className="tc-place">{t.place ?? <span className="dim">—</span>}</span>
                <Icon name="chevRight" size={14} className="dim" />
              </a>
            );
          })}
        </div>

        {loose.length && groups.length ? (
          <p className="hint" style={{ marginTop: "var(--sp-3)" }}>
            {loose.length} not in a category — that is fine, categories are optional.
          </p>
        ) : null}
      </div>

      {/* ── popups: wide, and they can be opened another way ── */}

      {pattern ? (
        <Popup
          size="wide"
          title={pattern.name}
          sub={`${pattern.cadence} · ${pattern.tasks.length} tasks`}
          onClose={() => setOpen(null)}
        >
          <div className="sched">
            {pattern.tasks
              .slice()
              .sort((a, b) => fromDawn(a.startMin ?? 0) - fromDawn(b.startMin ?? 0))
              .map(slot)}
          </div>
        </Popup>
      ) : null}

      {category ? (
        <Popup
          size="wide"
          title={category.name}
          sub={`${category.tasks.length} task${category.tasks.length === 1 ? "" : "s"}`}
          onClose={() => setOpen(null)}
          footer={
            <>
              <button className="btn" onClick={() => setEditing(category)}>
                <Icon name="edit" size={14} />
                Edit
              </button>
              <button
                className="btn"
                style={{ marginLeft: "auto" }}
                onClick={() => {
                  planner.removeCategory(category.id);
                  setOpen(null);
                }}
              >
                <Icon name="trash" size={14} />
                Delete
              </button>
            </>
          }
        >
          {category.tasks.length ? (
            <div className="sched">{category.tasks.map(slot)}</div>
          ) : (
            <div className="cat-empty">Nothing here yet. Add a task to this category from its page.</div>
          )}
        </Popup>
      ) : null}

      {making ? (
        <Popup size="wide" title="New category" onClose={() => setMaking(false)}>
          <CategoryForm
            onCancel={() => setMaking(false)}
            onSave={(v) => {
              planner.addCategory(v);
              setMaking(false);
            }}
          />
        </Popup>
      ) : null}

      {editing ? (
        <Popup size="wide" title={`Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <CategoryForm
            initial={editing}
            onCancel={() => setEditing(null)}
            onSave={(v) => {
              planner.updateCategory(editing.id, v);
              setEditing(null);
            }}
          />
        </Popup>
      ) : null}
    </div>
  );
}
