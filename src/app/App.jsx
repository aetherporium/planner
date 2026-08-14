/**
 * Planner — a day scheduler.
 *
 * The day is the core. Everything else is reached from it.
 * One view at a time. Navigation lives in the content.
 * Times read in 12-hour form starting at 12 in the morning; morning and
 * afternoon are told apart by a mark, never by the letters am/pm.
 */

import { useMemo, useState } from "react";
import Icon from "./Icon.jsx";
import Clock from "./Clock.jsx";
import Timeline from "./Timeline.jsx";
import Mark, { Time } from "./Mark.jsx";
import { t12 } from "./format.js";
import NavPrototype from "./prototype-nav.jsx";
import { useRoute, useTheme, useNowTick } from "./hooks.js";
import { usePlanner, readNow, ruleIdOf } from "./store.js";
import { EC_MONTHS, GC_MONTHS, DOW, ecMonthDays, dayFromJdn } from "../calendar.mjs";
import { ruleFromFrequency } from "../blueprint.mjs";
import { patternsIn, categorise, colorOf, CATEGORY_COLORS, patternName } from "../patterns.mjs";
import {
  STATUS,
  fmtDur,
  parseTime,
  canCompleteAt,
  loggedLate,
  driftedFromPlan,
} from "../log.mjs";

/* Amharic belongs to the calendar. */
const EC_M_AM = [
  "መስከረም", "ጥቅምት", "ኅዳር", "ታኅሣሥ", "ጥር", "የካቲት",
  "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ",
];
const DOW_AM_2 = ["እሑ", "ሰኞ", "ማክ", "ረቡ", "ሐሙ", "ዓር", "ቅዳ"];

const gcShort = (d) => `${DOW[d.dow].slice(0, 3)} ${d.gc.d} ${GC_MONTHS[d.gc.m - 1].slice(0, 3)}`;
const monthHref = (y, m) => `#/calendar/${y}-${m}`;

/* ── Top bar: back on the left, theme on the right. Nothing else. ─────── */

function Top({ back, theme, onToggle }) {
  return (
    <div className="top">
      {back ? (
        <a className="top-back" href={back.href}>
          <Icon name="arrowLeft" size={16} />
          {back.label}
        </a>
      ) : (
        <span />
      )}
      <button
        className="top-theme"
        onClick={onToggle}
        aria-label={theme === "dark" ? "Switch to light" : "Switch to dark"}
        title={theme === "dark" ? "Switch to light" : "Switch to dark"}
      >
        <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
      </button>
    </div>
  );
}

/* ── The day — the core page ──────────────────────────────────────────── */

function DayPage({ jdn, planner, now, theme, onToggle }) {
  const day = dayFromJdn(jdn);
  const isToday = jdn === now.jdn;
  const timeline = planner.timelineFor(jdn);
  const tasks = planner.tasksFor(jdn);

  return (
    <div className="page">
      <Top back={isToday ? null : { href: "#/", label: "Today" }} theme={theme} onToggle={onToggle} />

      <header className="dayhead glass">
        <Clock minutes={isToday ? now.minutes : 0} seconds={isToday ? now.seconds : 0} size={78} />

        <div className="grow">
          <div className="datenav">
            <a className="stepper" href={`#/day/${jdn - 1}`} aria-label="Previous day">
              <Icon name="chevLeft" size={16} />
            </a>
            <h1 className="title">{isToday ? "Today" : DOW[day.dow]}</h1>
            <a className="stepper" href={`#/day/${jdn + 1}`} aria-label="Next day">
              <Icon name="chevRight" size={16} />
            </a>
          </div>
          <div className="dual">
            <a className="am" href={monthHref(day.ec.y, day.ec.m)}>
              {EC_M_AM[day.ec.m - 1]} {day.ec.d}, {day.ec.y}
            </a>
            <span className="dot">·</span>
            <span>
              {DOW[day.dow]} {day.gc.d} {GC_MONTHS[day.gc.m - 1]} {day.gc.y}
            </span>
          </div>
        </div>
      </header>

      {tasks.length === 0 ? (
        <div className="glass panel">
          <div className="empty">
            <div className="icon-slot">
              <Icon name="day" size={18} />
            </div>
            Nothing is planned for this day yet.
            <div style={{ marginTop: 14 }}>
              <a className="linkline" href={`#/day/${jdn}/add`}>
                <Icon name="plus" size={14} />
                Plan something
              </a>
            </div>
          </div>
        </div>
      ) : (
        <Timeline
          timeline={timeline}
          jdn={jdn}
          nowMin={now.minutes}
          isToday={isToday}
          statusFor={planner.statusFor}
        />
      )}
    </div>
  );
}

/* ── Calendar ─────────────────────────────────────────────────────────── */

function CalendarPage({ ecY, ecM, planner, now, theme, onToggle }) {
  const today = dayFromJdn(now.jdn);
  const y = ecY ?? today.ec.y;
  const m = ecM ?? today.ec.m;
  const days = useMemo(() => ecMonthDays(y, m), [y, m]);
  const lead = days.length ? days[0].dow : 0;
  const prevM = m === 1 ? { y: y - 1, m: 13 } : { y, m: m - 1 };
  const nextM = m === 13 ? { y: y + 1, m: 1 } : { y, m: m + 1 };

  const gcSpan = days.length
    ? (() => {
        const a = days[0].gc;
        const b = days[days.length - 1].gc;
        return a.m === b.m
          ? `${GC_MONTHS[a.m - 1]} ${a.y}`
          : `${GC_MONTHS[a.m - 1]} – ${GC_MONTHS[b.m - 1]} ${b.y}`;
      })()
    : "";

  return (
    <div className="page">
      <Top back={{ href: "#/", label: "Today" }} theme={theme} onToggle={onToggle} />

      <div className="glass panel">
        <div className="cal-head">
          <div>
            <h1 className="title">
              <span className="am">{EC_M_AM[m - 1]}</span>{" "}
              <span className="muted" style={{ fontWeight: 400 }}>{y}</span>
            </h1>
            <div className="sub">{EC_MONTHS[m - 1]} · {gcSpan}</div>
          </div>
          <div className="datenav">
            <a className="stepper" href={monthHref(prevM.y, prevM.m)} aria-label="Previous month">
              <Icon name="chevLeft" size={16} />
            </a>
            <a className="stepper" href={monthHref(nextM.y, nextM.m)} aria-label="Next month">
              <Icon name="chevRight" size={16} />
            </a>
          </div>
        </div>

        <div className="cal-grid">
          {DOW_AM_2.map((d, i) => (
            <div key={d} className="cal-dow am" title={DOW[i]}>{d}</div>
          ))}
          {Array.from({ length: lead }, (_, i) => <div key={`b${i}`} className="cell blank" />)}
          {days.map((d) => {
            const count = planner.tasksFor(d.jdn).length;
            const logs = planner.entries.filter((e) => e.dayJdn === d.jdn).length;
            return (
              <a
                key={d.jdn}
                className={["cell", d.jdn === now.jdn ? "today" : "", d.isWeekend ? "weekend" : "",
                  d.holidays.length ? "hol" : ""].filter(Boolean).join(" ")}
                href={`#/day/${d.jdn}`}
                title={`${d.dowName} ${d.gc.d} ${GC_MONTHS[d.gc.m - 1]} — ${count} planned`}
              >
                <span className="ec am">{d.ec.d}</span>
                <span className="gc">{d.gc.d} {GC_MONTHS[d.gc.m - 1].slice(0, 3)}</span>
                <span className="marks">
                  {count ? <span className="mark" /> : null}
                  {logs ? <span className="mark accent" /> : null}
                  {d.holidays.length ? <span className="mark gold" /> : null}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Blueprints — where tasks are added, grouped, and shaped ──────────── */

function BlueprintsPage({ planner, now, theme, onToggle, focus }) {
  const recurring = planner.allTasks.filter((t) => t.rule);
  const patterns = useMemo(() => patternsIn(recurring), [recurring]);
  const { groups, loose } = useMemo(
    () => categorise(planner.allTasks, planner.categories),
    [planner.allTasks, planner.categories],
  );

  const [open, setOpen] = useState(focus ?? (patterns[0]?.id ?? null));
  const [newCat, setNewCat] = useState(false);
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState("blue");

  const shown = patterns.find((p) => p.id === open) ?? null;

  return (
    <div className="page">
      <Top back={{ href: "#/", label: "Today" }} theme={theme} onToggle={onToggle} />

      <div className="bp-head">
        <h1 className="title">Blueprints</h1>
        <a className="btn primary" href={`#/day/${now.jdn}/add`}>
          <Icon name="plus" size={15} />
          New task
        </a>
      </div>

      {/* Patterns — observed, never authored. Most frequent first. */}
      {patterns.length ? (
        <>
          <h2 className="section">Patterns</h2>
          <div className="pat-strip">
            {patterns.map((p) => (
              <button
                key={p.id}
                className={`pat${open === p.id ? " on" : ""}`}
                onClick={() => setOpen(open === p.id ? null : p.id)}
              >
                <Icon name="pattern" size={15} className="pat-i" />
                <span className="pat-n">{p.name}</span>
                <span className="pat-c">{p.cadence}</span>
                <span className="pat-k">{p.tasks.length} task{p.tasks.length === 1 ? "" : "s"}</span>
              </button>
            ))}
          </div>

          {shown ? (
            <div className="glass-quiet panel tight" style={{ marginBottom: "var(--sp-5)" }}>
              <div className="rows">
                {shown.tasks
                  .slice()
                  .sort((a, b) => (a.startMin ?? 0) - (b.startMin ?? 0))
                  .map((t) => (
                    <a key={t.id} className="row" href={`#/task/${t.id}/${now.jdn}`}>
                      <span className="grow">
                        <div className="r-title" style={t.enabled === false ? { color: "var(--ink-3)" } : undefined}>
                          {t.title}
                        </div>
                        <div className="r-sub">
                          {t.enabled === false ? "Turned off" : <>
                            <Time min={t.startMin} size={6} /> · {fmtDur(t.duration ?? 0)}
                          </>}
                        </div>
                      </span>
                      <Icon name="chevRight" size={15} className="dim" />
                    </a>
                  ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {/* Categories — the user's own grouping. */}
      <div className="bp-head sub-head">
        <h2 className="section" style={{ margin: 0 }}>Categories</h2>
        <button className="linkline" onClick={() => setNewCat((v) => !v)}>
          <Icon name={newCat ? "cross" : "plus"} size={14} />
          {newCat ? "Cancel" : "New category"}
        </button>
      </div>

      {newCat ? (
        <form
          className="glass panel"
          style={{ marginBottom: "var(--sp-4)" }}
          onSubmit={(e) => {
            e.preventDefault();
            if (!catName.trim()) return;
            planner.addCategory({ name: catName.trim(), color: catColor });
            setCatName("");
            setNewCat(false);
          }}
        >
          <div className="field">
            <label htmlFor="cn">Name</label>
            <input
              id="cn"
              className="input"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="School, home, errands…"
              autoFocus
            />
          </div>
          <div className="field">
            <label>Colour</label>
            <div className="swatches">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`swatch${catColor === c.id ? " on" : ""}`}
                  style={{ "--h": c.hue }}
                  onClick={() => setCatColor(c.id)}
                  aria-label={c.label}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <button className="btn primary" type="submit" disabled={!catName.trim()}>
            <Icon name="plus" size={15} />
            Create
          </button>
        </form>
      ) : null}

      {groups.length === 0 && !newCat ? (
        <div className="glass-quiet panel">
          <div className="empty" style={{ padding: "var(--sp-5) var(--sp-4)" }}>
            <div className="icon-slot"><Icon name="tag" size={18} /></div>
            No categories yet. Group tasks your own way — school, home, whatever fits.
          </div>
        </div>
      ) : (
        <div className="cat-list">
          {groups.map((c) => {
            const col = colorOf(c.color);
            return (
              <div key={c.id} className="cat glass-quiet" style={{ "--h": col.hue }}>
                <div className="cat-head">
                  <span className="cat-dot" />
                  <span className="cat-name">{c.name}</span>
                  <span className="cat-count">{c.tasks.length}</span>
                  <span className="cat-tools">
                    {CATEGORY_COLORS.map((k) => (
                      <button
                        key={k.id}
                        className={`swatch sm${c.color === k.id ? " on" : ""}`}
                        style={{ "--h": k.hue }}
                        onClick={() => planner.updateCategory(c.id, { color: k.id })}
                        aria-label={`${c.name} in ${k.label}`}
                        title={k.label}
                      />
                    ))}
                    <button
                      className="stepper"
                      onClick={() => planner.removeCategory(c.id)}
                      aria-label={`Delete ${c.name}`}
                      title="Delete category"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </span>
                </div>
                {c.tasks.length ? (
                  <div className="rows">
                    {c.tasks.map((t) => (
                      <a key={t.id} className="row" href={`#/task/${t.id}/${now.jdn}`}>
                        <span className="grow">
                          <div className="r-title">{t.title}</div>
                          <div className="r-sub">
                            {t.rule ? patternName(t.rule) : "One-off"}
                            {t.startMin != null ? <> · <Time min={t.startMin} size={6} /></> : null}
                          </div>
                        </span>
                        <Icon name="chevRight" size={15} className="dim" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="cat-empty">Nothing here yet.</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {loose.length && groups.length ? (
        <div className="cat glass-quiet" style={{ "--h": 220, marginTop: "var(--sp-3)" }}>
          <div className="cat-head">
            <span className="cat-dot" style={{ opacity: 0.35 }} />
            <span className="cat-name muted">Uncategorised</span>
            <span className="cat-count">{loose.length}</span>
          </div>
          <div className="rows">
            {loose.map((t) => (
              <a key={t.id} className="row" href={`#/task/${t.id}/${now.jdn}`}>
                <span className="grow">
                  <div className="r-title">{t.title}</div>
                  <div className="r-sub">{t.rule ? patternName(t.rule) : "One-off"}</div>
                </span>
                <Icon name="chevRight" size={15} className="dim" />
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ── Task detail ──────────────────────────────────────────────────────── */

function TaskPage({ id, jdn, planner, now, theme, onToggle }) {
  const task = planner.findTask(id);
  const dayJdn = jdn ?? now.jdn;
  const day = dayFromJdn(dayJdn);
  const [note, setNote] = useState("");
  const [atText, setAtText] = useState(null);

  if (!task) {
    return (
      <div className="page">
        <Top back={{ href: "#/", label: "Today" }} theme={theme} onToggle={onToggle} />
        <div className="glass panel">
          <div className="empty">This task no longer exists.</div>
        </div>
      </div>
    );
  }

  const entry = planner.statusFor(task.id, dayJdn);
  const st = entry?.status ?? STATUS.UNKNOWN;
  const bpId = task.rule ? ruleIdOf(task.rule) : null;
  const actualMin = atText != null ? parseTime(atText) : (entry?.actualMin ?? task.startMin);
  const check = canCompleteAt({ dayJdn, actualMin: actualMin ?? task.startMin }, now);

  const setStatus = (status) =>
    planner.log(
      {
        taskId: task.id,
        dayJdn,
        status,
        plannedMin: task.startMin ?? null,
        actualMin: status === STATUS.DONE ? (actualMin ?? task.startMin ?? null) : null,
        durationMin: task.duration ?? null,
        note,
        title: task.title,
      },
      now,
    );

  return (
    <div className="page">
      <Top
        back={{ href: `#/day/${dayJdn}`, label: dayJdn === now.jdn ? "Today" : gcShort(day) }}
        theme={theme}
        onToggle={onToggle}
      />

      <div className="glass panel">
        <span className="eyebrow">
          {task.isDefault ? "Default" : task.rule ? patternName(task.rule) : "One-off"}
        </span>
        <h1 className="title" style={{ marginTop: 4 }}>{task.title}</h1>
        {task.titleAm ? <div className="sub am" style={{ marginTop: 2 }}>{task.titleAm}</div> : null}

        <div className="split" style={{ marginTop: "var(--sp-5)" }}>
          <div className="kv">
            <span className="k">Planned</span>
            <span className="v"><Time min={task.startMin} size={8} /></span>
            <span className="sub">{fmtDur(task.duration ?? 0)}</span>
          </div>
          <div className="kv">
            <span className="k">Actual</span>
            <span className="v" style={entry?.actualMin != null ? undefined : { color: "var(--ink-4)" }}>
              {entry?.actualMin != null ? <Time min={entry.actualMin} size={8} /> : "—"}
            </span>
            <span className="sub">{entry && driftedFromPlan(entry) ? "Different from plan" : "\u00a0"}</span>
          </div>
          <div className="kv">
            <span className="k">Logged</span>
            <span className="v" style={entry ? undefined : { color: "var(--ink-4)" }}>
              {entry?.loggedAtMin != null ? <Time min={entry.loggedAtMin} size={8} /> : "—"}
            </span>
            <span className="sub">{entry && loggedLate(entry) ? "Entered on another day" : "\u00a0"}</span>
          </div>
        </div>
      </div>

      <div className="glass panel">
        <h2 className="section">Did this happen?</h2>
        <div className="field">
          <label htmlFor="at">At what time</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              id="at"
              className="input"
              style={{ maxWidth: 120 }}
              value={atText ?? t12(actualMin ?? task.startMin)}
              onChange={(e) => setAtText(e.target.value)}
              placeholder="h:mm"
              inputMode="numeric"
            />
            <Mark pm={(actualMin ?? task.startMin ?? 0) >= 720} size={9} />
          </div>
        </div>

        {!check.ok ? (
          <div className="warn" style={{ marginBottom: "var(--sp-4)" }}>
            <Icon name="warn" size={15} style={{ marginTop: 2 }} />
            <span>{check.reason} You can reschedule it instead — nothing is lost by moving it.</span>
          </div>
        ) : null}

        <div className="btnrow">
          <button className={`btn${st === STATUS.DONE ? " on" : ""}`} disabled={!check.ok}
            onClick={() => setStatus(STATUS.DONE)}>
            <Icon name="check" size={15} /> Yes, I did this
          </button>
          <button className={`btn${st === STATUS.SKIPPED ? " on neutral" : ""}`}
            onClick={() => setStatus(STATUS.SKIPPED)}>
            <Icon name="cross" size={15} /> No, I did not
          </button>
          <button className={`btn${st === STATUS.RESCHEDULED ? " on neutral" : ""}`}
            onClick={() => setStatus(STATUS.RESCHEDULED)}>
            <Icon name="move" size={15} /> Moved it
          </button>
        </div>

        <p className="hint" style={{ marginTop: "var(--sp-3)", maxWidth: "54ch" }}>
          {st === STATUS.UNKNOWN
            ? "Right now this is blank, which means no information — not that you failed. Choosing again clears it back to blank."
            : "Choosing the same answer again clears it back to blank."}
        </p>

        <details className="disclosure" style={{ marginTop: "var(--sp-4)" }}>
          <summary><Icon name="chevRight" size={13} className="chev" /> Add a note</summary>
          <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="What actually happened?" />
        </details>
      </div>

      {entry?.note ? <div className="note">{entry.note}</div> : null}

      <div className="glass panel">
        <h2 className="section">Category</h2>
        <div className="chips">
          {planner.categories.map((c) => (
            <button
              key={c.id}
              className={`chip pick${task.categoryId === c.id ? " on" : ""}`}
              style={{ "--h": colorOf(c.color).hue }}
              onClick={() =>
                planner.setCategory(task.id, task.categoryId === c.id ? null : c.id)
              }
            >
              <span className="cat-dot sm" />
              {c.name}
            </button>
          ))}
          <a className="chip" href="#/blueprints">
            <Icon name="plus" size={12} /> Manage
          </a>
        </div>
      </div>

      <div className="btnrow" style={{ marginTop: "var(--sp-4)" }}>
        {!task.isDefault ? (
          <button className="btn" onClick={() => {
            planner.removeTask(task.id);
            window.location.hash = `#/day/${dayJdn}`;
          }}>
            <Icon name="trash" size={15} /> Remove this task
          </button>
        ) : (
          <>
            <button className="btn" onClick={() => planner.toggleDefault(task.key)}>
              <Icon name="off" size={15} />
              {task.enabled === false ? "Turn back on" : "Turn this default off"}
            </button>
            <span className="hint">A default you turn off stays visible on its pattern.</span>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Add ──────────────────────────────────────────────────────────────── */

function AddPage({ jdn, planner, now, theme, onToggle }) {
  const day = dayFromJdn(jdn);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("9:00");
  const [pm, setPm] = useState(false);
  const [dur, setDur] = useState("30");
  const [freq, setFreq] = useState("once");
  const [place, setPlace] = useState("");
  const [categoryId, setCategoryId] = useState(null);

  const compound = /\s(&|and|\+)\s/i.test(title);
  const raw = parseTime(start.includes(":") ? start : `${start}:00`);
  const startMin = raw == null ? null : (() => {
    const h = Math.floor(raw / 60) % 12;
    return (pm ? h + 12 : h) * 60 + (raw % 60);
  })();
  const valid = title.trim() && startMin != null && Number(dur) > 0 && !compound;

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    const rule = ruleFromFrequency(freq, day);
    planner.addTask({
      title: title.trim(),
      startMin,
      duration: Number(dur),
      place: place.trim() || null,
      rule,
      dates: rule ? null : [day.iso],
      categoryId,
    });
    window.location.hash = `#/day/${jdn}`;
  };

  return (
    <div className="page">
      <Top back={{ href: `#/day/${jdn}`, label: jdn === now.jdn ? "Today" : gcShort(day) }}
        theme={theme} onToggle={onToggle} />

      <form className="glass panel" onSubmit={submit}>
        <h1 className="title">Plan something</h1>
        <p className="sub" style={{ marginTop: 4, marginBottom: "var(--sp-5)" }}>
          <span className="am">{EC_M_AM[day.ec.m - 1]} {day.ec.d}</span> ·{" "}
          {DOW[day.dow]} {day.gc.d} {GC_MONTHS[day.gc.m - 1]} {day.gc.y}
        </p>

        <div className="field">
          <label htmlFor="t">What</label>
          <input id="t" className="input" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="One activity" autoFocus />
          {compound ? (
            <span className="hint" style={{ color: "var(--rose)" }}>
              That looks like two activities. Split them — each one is its own task.
            </span>
          ) : null}
        </div>

        <div className="inline-fields">
          <div className="field">
            <label htmlFor="s">Starts</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input id="s" className="input" style={{ maxWidth: 100 }} value={start}
                onChange={(e) => setStart(e.target.value)} placeholder="9:00" inputMode="numeric" />
              <div className="seg">
                <button type="button" className={!pm ? "on" : ""} onClick={() => setPm(false)}
                  aria-label="morning" title="morning">
                  <Mark pm={false} size={9} />
                </button>
                <button type="button" className={pm ? "on" : ""} onClick={() => setPm(true)}
                  aria-label="afternoon" title="afternoon">
                  <Mark pm size={9} />
                </button>
              </div>
            </div>
          </div>
          <div className="field">
            <label htmlFor="d">Minutes</label>
            <input id="d" className="input" value={dur}
              onChange={(e) => setDur(e.target.value.replace(/\D/g, ""))} inputMode="numeric" />
          </div>
        </div>

        <details className="disclosure">
          <summary><Icon name="chevRight" size={13} className="chev" /> More options</summary>

          <div className="field">
            <label htmlFor="f">Repeats</label>
            <select id="f" className="select" value={freq} onChange={(e) => setFreq(e.target.value)}>
              <option value="once">Just this day</option>
              <option value="daily">Every day</option>
              <option value="weekly">Every {DOW[day.dow]}</option>
              <option value="monthly">Day {day.gc.d} of each Gregorian month</option>
              <option value="ec-monthly">Day {day.ec.d} of each Ethiopian month</option>
            </select>
            {freq !== "once" ? (
              <span className="hint">
                This joins the <strong>{patternName(ruleFromFrequency(freq, day))}</strong> pattern
                automatically.
              </span>
            ) : null}
          </div>

          {planner.categories.length ? (
            <div className="field">
              <label>Category</label>
              <div className="chips">
                {planner.categories.map((c) => (
                  <button key={c.id} type="button"
                    className={`chip pick${categoryId === c.id ? " on" : ""}`}
                    style={{ "--h": colorOf(c.color).hue }}
                    onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}>
                    <span className="cat-dot sm" />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="field">
            <label htmlFor="p">Place</label>
            <input id="p" className="input" value={place} onChange={(e) => setPlace(e.target.value)}
              placeholder="Home, office, market…" />
            <span className="hint">
              Naming places lets the planner see travel between them and reserve the time.
            </span>
          </div>
        </details>

        <div className="btnrow" style={{ marginTop: "var(--sp-5)" }}>
          <button className="btn primary" type="submit" disabled={!valid}>
            <Icon name="plus" size={15} /> Add
          </button>
          <a className="linkline" href={`#/day/${jdn}`}>Cancel</a>
        </div>
      </form>
    </div>
  );
}

/* ── Root ─────────────────────────────────────────────────────────────── */

export default function App() {
  const route = useRoute();
  const [theme, toggleTheme] = useTheme();
  const planner = usePlanner();

  useNowTick(true);
  const now = readNow();
  const common = { planner, now, theme, onToggle: toggleTheme };

  let page;
  switch (route.name) {
    case "calendar":
      page = <CalendarPage ecY={route.ecY} ecM={route.ecM} {...common} />;
      break;
    case "day":
      page = <DayPage jdn={route.jdn} {...common} />;
      break;
    case "add":
      page = <AddPage jdn={route.jdn} {...common} />;
      break;
    case "blueprints":
      page = <BlueprintsPage focus={route.focus} {...common} />;
      break;
    case "task":
      page = <TaskPage id={route.id} jdn={route.jdn} {...common} />;
      break;
    case "prototype":
      return <NavPrototype variant={route.variant} {...common} />;
    default:
      page = <DayPage jdn={now.jdn} {...common} />;
  }

  return <div className="shell">{page}</div>;
}

export { DayPage, CalendarPage, BlueprintsPage, TaskPage, AddPage, Top };
