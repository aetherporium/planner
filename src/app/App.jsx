/**
 * Planner — a day scheduler.
 *
 * Structure notes that matter:
 *   - The CALENDAR is the root of the branch. Today is not the trunk; it is the
 *     day you happen to land on. `#/` renders today, but its breadcrumb sits
 *     inside Calendar › month › day, so moving up and out always works.
 *   - Navigation is hyperlinks only. Buttons exist solely to change state.
 *   - One view at a time. No top bar, no sidebar. You move through content.
 *   - Nothing is seeded. An empty day renders as an empty day.
 */

import { useMemo, useState } from "react";
import Icon from "./Icon.jsx";
import Clock from "./Clock.jsx";
import Timeline from "./Timeline.jsx";
import { useRoute, useTheme, useNowTick } from "./hooks.js";
import { usePlanner, readNow, RULES, ruleById, ruleIdOf, ruleLabel } from "./store.js";
import {
  EC_MONTHS,
  GC_MONTHS,
  DOW,
  ecMonthDays,
  ecMonthLength,
  dayFromJdn,
  dayFromEc,
  ecToJdn,
} from "../calendar.mjs";
import { firesOn, describeRule, conditionsMet, ruleFromFrequency } from "../blueprint.mjs";
import { DEFAULT_TASKS } from "../defaults.mjs";
import {
  STATUS,
  fmtTime,
  fmtDur,
  parseTime,
  canCompleteAt,
  loggedLate,
  driftedFromPlan,
} from "../log.mjs";

/* Amharic is reserved for the calendar. */
const EC_M_AM = [
  "መስከረም", "ጥቅምት", "ኅዳር", "ታኅሣሥ", "ጥር", "የካቲት",
  "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ",
];
const DOW_AM = ["እሑድ", "ሰኞ", "ማክሰኞ", "ረቡዕ", "ሐሙስ", "ዓርብ", "ቅዳሜ"];
const DOW_AM_2 = ["እሑ", "ሰኞ", "ማክ", "ረቡ", "ሐሙ", "ዓር", "ቅዳ"];

const gcShort = (d) => `${DOW[d.dow].slice(0, 3)} ${d.gc.d} ${GC_MONTHS[d.gc.m - 1].slice(0, 3)}`;
const monthHref = (y, m) => `#/calendar/${y}-${m}`;

/* ── Chrome ──────────────────────────────────────────────────────────── */

function Crumbs({ items }) {
  return (
    <nav className="crumbs">
      {items.map((it, i) => (
        <span key={i} style={{ display: "contents" }}>
          {i > 0 ? <span className="sep">/</span> : null}
          {it.href ? (
            <a href={it.href}>{it.label}</a>
          ) : (
            <span className="here">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      className="btn"
      onClick={onToggle}
      title={theme === "dark" ? "Switch to light" : "Switch to dark"}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} size={15} />
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}

function Foot({ links, theme, onToggle }) {
  return (
    <div className="footlinks">
      {links.map((l) => (
        <a key={l.href} href={l.href}>
          <Icon name={l.icon} size={15} />
          {l.label}
        </a>
      ))}
      <span style={{ marginLeft: "auto" }}>
        <ThemeToggle theme={theme} onToggle={onToggle} />
      </span>
    </div>
  );
}

/* ── Day (also the landing page) ─────────────────────────────────────── */

function DayPage({ jdn, planner, now, theme, onToggle }) {
  const day = dayFromJdn(jdn);
  const isToday = jdn === now.jdn;
  const timeline = planner.timelineFor(jdn);
  const tasks = planner.tasksFor(jdn);
  const prev = jdn - 1;
  const next = jdn + 1;

  const logged = planner.entries.filter((e) => e.dayJdn === jdn);
  const doneCount = logged.filter((e) => e.status === STATUS.DONE).length;

  const conds = conditionsMet(day);
  const activeRules = RULES.filter((r) => firesOn(r.rule, day));

  return (
    <div className="page">
      <Crumbs
        items={[
          { label: "Calendar", href: "#/calendar" },
          { label: EC_MONTHS[day.ec.m - 1], href: monthHref(day.ec.y, day.ec.m) },
          { label: isToday ? "Today" : gcShort(day) },
        ]}
      />

      <header className="dayhead glass">
        <div className="grow">
          <div className="datenav">
            <a className="stepper" href={`#/day/${prev}`} title="Previous day" aria-label="Previous day">
              <Icon name="chevLeft" size={16} />
            </a>
            <h1 className="title">
              {isToday ? "Today" : DOW[day.dow]}
            </h1>
            <a className="stepper" href={`#/day/${next}`} title="Next day" aria-label="Next day">
              <Icon name="chevRight" size={16} />
            </a>
          </div>

          <div className="dual">
            <span className="am">
              {EC_M_AM[day.ec.m - 1]} {day.ec.d}, {day.ec.y}
            </span>
            <span className="dot">·</span>
            <span>
              {DOW[day.dow]} {day.gc.d} {GC_MONTHS[day.gc.m - 1]} {day.gc.y}
            </span>
          </div>

          <div className="chips">
            {day.holidays.map((h) => (
              <span key={h} className="chip holiday">
                <Icon name="calendar" size={12} />
                {h}
              </span>
            ))}
            {activeRules.slice(0, 3).map((r) => (
              <a key={r.id} className="chip" href={`#/blueprint/${r.id}`}>
                <Icon name="layers" size={12} />
                {describeRule(r.rule)}
              </a>
            ))}
          </div>
        </div>

        {isToday ? (
          <Clock minutes={now.minutes} seconds={now.seconds} label="now" />
        ) : (
          <div className="kv" style={{ textAlign: "right" }}>
            <span className="k">{jdn < now.jdn ? "Past" : "Ahead"}</span>
            <span className="v small">
              {Math.abs(jdn - now.jdn)} day{Math.abs(jdn - now.jdn) === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </header>

      {tasks.length === 0 ? (
        <div className="glass panel">
          <div className="empty">
            <div className="icon-slot">
              <Icon name="today" size={18} />
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

      <div className="btnrow" style={{ marginTop: "var(--sp-4)" }}>
        <a className="linkline" href={`#/day/${jdn}/add`}>
          <Icon name="plus" size={14} />
          Add to this day
        </a>
        {logged.length ? (
          <span className="sub" style={{ marginLeft: "auto" }}>
            {logged.length} logged{doneCount ? ` · ${doneCount} done` : ""}
          </span>
        ) : null}
      </div>

      <Foot
        theme={theme}
        onToggle={onToggle}
        links={[
          { href: monthHref(day.ec.y, day.ec.m), label: EC_MONTHS[day.ec.m - 1], icon: "calendar" },
          { href: "#/blueprints", label: "Blueprints", icon: "layers" },
          ...(isToday ? [] : [{ href: "#/", label: "Back to today", icon: "today" }]),
        ]}
      />
    </div>
  );
}

/* ── Calendar — the root of the branch ───────────────────────────────── */

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
      <Crumbs items={[{ label: "Calendar", href: "#/calendar" }, { label: `${EC_MONTHS[m - 1]} ${y}` }]} />

      <div className="glass panel">
        <div className="cal-head">
          <div>
            <h1 className="title">
              <span className="am">{EC_M_AM[m - 1]}</span>{" "}
              <span className="muted" style={{ fontWeight: 400 }}>{y}</span>
            </h1>
            <div className="sub">
              {EC_MONTHS[m - 1]} · {gcSpan}
            </div>
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
            <div key={d} className="cal-dow am" title={DOW[i]}>
              {d}
            </div>
          ))}

          {Array.from({ length: lead }, (_, i) => (
            <div key={`b${i}`} className="cell blank" />
          ))}

          {days.map((d) => {
            const count = planner.tasksFor(d.jdn).length;
            const logs = planner.entries.filter((e) => e.dayJdn === d.jdn).length;
            return (
              <a
                key={d.jdn}
                className={[
                  "cell",
                  d.jdn === now.jdn ? "today" : "",
                  d.isWeekend ? "weekend" : "",
                  d.holidays.length ? "hol" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
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

      <div className="glass-quiet panel tight">
        <div className="rows">
          <a className="row" href={`#/day/${now.jdn}`}>
            <span className="icon-slot accent">
              <Icon name="today" size={16} />
            </span>
            <span className="grow">
              <div className="r-title">Today</div>
              <div className="r-sub">
                <span className="am">
                  {EC_M_AM[today.ec.m - 1]} {today.ec.d}
                </span>{" "}
                · {gcShort(today)}
              </div>
            </span>
            <Icon name="chevRight" size={15} className="dim" />
          </a>
          <a className="row" href="#/blueprints">
            <span className="icon-slot">
              <Icon name="layers" size={16} />
            </span>
            <span className="grow">
              <div className="r-title">Blueprints</div>
              <div className="r-sub">What you do on each kind of day</div>
            </span>
            <Icon name="chevRight" size={15} className="dim" />
          </a>
        </div>
      </div>

      <Foot
        theme={theme}
        onToggle={onToggle}
        links={[
          { href: monthHref(prevM.y, prevM.m), label: EC_MONTHS[prevM.m - 1], icon: "chevLeft" },
          { href: monthHref(nextM.y, nextM.m), label: EC_MONTHS[nextM.m - 1], icon: "chevRight" },
        ]}
      />
    </div>
  );
}

/* ── Blueprints ──────────────────────────────────────────────────────── */

function BlueprintsPage({ planner, now, theme, onToggle }) {
  const today = dayFromJdn(now.jdn);

  return (
    <div className="page">
      <Crumbs items={[{ label: "Calendar", href: "#/calendar" }, { label: "Blueprints" }]} />

      <div className="glass panel">
        <h1 className="title">Blueprints</h1>
        <p className="sub" style={{ marginTop: 6, maxWidth: "46ch" }}>
          What you do unfailingly on a given kind of day. Each one is its own page.
        </p>
      </div>

      <div className="glass-quiet panel tight">
        <div className="rows">
          {RULES.map((r) => {
            const count = planner.allTasks.filter(
              (t) => t.rule && ruleIdOf(t.rule) === r.id,
            ).length;
            const firesToday = firesOn(r.rule, today);
            return (
              <a key={r.id} className="row" href={`#/blueprint/${r.id}`}>
                <span className={`icon-slot${firesToday ? " accent" : ""}`}>
                  <Icon name="layers" size={16} />
                </span>
                <span className="grow">
                  <div className="r-title">{describeRule(r.rule)}</div>
                  <div className="r-sub">
                    {count ? `${count} task${count === 1 ? "" : "s"}` : "Empty"}
                    {firesToday ? " · applies today" : ""}
                  </div>
                </span>
                <Icon name="chevRight" size={15} className="dim" />
              </a>
            );
          })}
        </div>
      </div>

      <Foot
        theme={theme}
        onToggle={onToggle}
        links={[
          { href: "#/", label: "Today", icon: "today" },
          { href: "#/calendar", label: "Calendar", icon: "calendar" },
        ]}
      />
    </div>
  );
}

function BlueprintPage({ id, planner, now, theme, onToggle }) {
  const rule = ruleById(id);
  const today = dayFromJdn(now.jdn);
  const idx = RULES.findIndex((r) => r.id === id);
  const prev = idx > 0 ? RULES[idx - 1] : null;
  const next = idx >= 0 && idx < RULES.length - 1 ? RULES[idx + 1] : null;

  if (!rule) {
    return (
      <div className="page">
        <Crumbs items={[{ label: "Blueprints", href: "#/blueprints" }, { label: "Not found" }]} />
        <div className="glass panel">
          <div className="empty">That blueprint does not exist.</div>
        </div>
      </div>
    );
  }

  const tasks = planner.allTasks
    .filter((t) => t.rule && ruleIdOf(t.rule) === id)
    .sort((a, b) => (a.startMin ?? 0) - (b.startMin ?? 0));

  const firesToday = firesOn(rule, today);
  const planned = tasks
    .filter((t) => t.enabled !== false)
    .reduce((s, t) => s + (t.duration ?? 0), 0);

  return (
    <div className="page">
      <Crumbs
        items={[
          { label: "Calendar", href: "#/calendar" },
          { label: "Blueprints", href: "#/blueprints" },
          { label: describeRule(rule) },
        ]}
      />

      <div className="glass panel">
        <span className="eyebrow">Blueprint</span>
        <h1 className="title" style={{ marginTop: 4 }}>{describeRule(rule)}</h1>
        <div className="split" style={{ marginTop: "var(--sp-4)" }}>
          <div className="kv">
            <span className="k">Tasks</span>
            <span className="v">{tasks.length}</span>
          </div>
          <div className="kv">
            <span className="k">Planned time</span>
            <span className="v">{planned ? fmtDur(planned) : "—"}</span>
          </div>
          <div className="kv">
            <span className="k">Today</span>
            <span className="v small">
              {firesToday ? (
                <a className="linkline" href={`#/day/${now.jdn}`}>
                  Applies <Icon name="chevRight" size={13} />
                </a>
              ) : (
                <span className="dim">Does not apply</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="glass panel">
          <div className="empty">
            <div className="icon-slot">
              <Icon name="layers" size={18} />
            </div>
            Nothing in this blueprint yet.
            <div style={{ marginTop: 14 }}>
              <a className="linkline" href={`#/day/${now.jdn}/add`}>
                <Icon name="plus" size={14} />
                Add a task with this frequency
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-quiet panel tight">
          <div className="rows">
            {tasks.map((t) => {
              const off = t.enabled === false;
              return (
                <a key={t.id} className="row" href={`#/task/${t.id}/${now.jdn}`}>
                  <span className="icon-slot">
                    <Icon name={off ? "off" : "clock"} size={16} />
                  </span>
                  <span className="grow">
                    <div className="r-title" style={off ? { color: "var(--ink-3)" } : undefined}>
                      {t.title}
                      {t.titleAm ? (
                        <span className="am muted" style={{ fontSize: "var(--f-sm)", marginLeft: 8 }}>
                          {t.titleAm}
                        </span>
                      ) : null}
                    </div>
                    <div className="r-sub">
                      {off ? "Turned off" : `${fmtTime(t.startMin)} · ${fmtDur(t.duration ?? 0)}`}
                      {t.place ? ` · ${t.place}` : ""}
                    </div>
                  </span>
                  <Icon name="chevRight" size={15} className="dim" />
                </a>
              );
            })}
          </div>
        </div>
      )}

      <Foot
        theme={theme}
        onToggle={onToggle}
        links={[
          ...(prev ? [{ href: `#/blueprint/${prev.id}`, label: describeRule(prev.rule), icon: "chevLeft" }] : []),
          ...(next ? [{ href: `#/blueprint/${next.id}`, label: describeRule(next.rule), icon: "chevRight" }] : []),
          { href: "#/blueprints", label: "All blueprints", icon: "layers" },
        ]}
      />
    </div>
  );
}

/* ── Task detail — where reality gets recorded ───────────────────────── */

function TaskPage({ id, jdn, planner, now, theme, onToggle }) {
  const task = planner.findTask(id);
  const dayJdn = jdn ?? now.jdn;
  const day = dayFromJdn(dayJdn);
  const [note, setNote] = useState("");
  const [atText, setAtText] = useState(null);

  if (!task) {
    return (
      <div className="page">
        <Crumbs items={[{ label: "Calendar", href: "#/calendar" }, { label: "Task not found" }]} />
        <div className="glass panel">
          <div className="empty">
            This task no longer exists.
            <div style={{ marginTop: 14 }}>
              <a className="linkline" href="#/">
                <Icon name="arrowLeft" size={14} /> Back to today
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const entry = planner.statusFor(task.id, dayJdn);
  const st = entry?.status ?? STATUS.UNKNOWN;
  const bpId = task.rule ? ruleIdOf(task.rule) : null;

  const actualMin = atText != null ? parseTime(atText) : (entry?.actualMin ?? task.startMin);
  const check = canCompleteAt({ dayJdn, actualMin: actualMin ?? task.startMin }, now);

  const setStatus = (status) => {
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
  };

  return (
    <div className="page">
      <Crumbs
        items={[
          { label: "Calendar", href: "#/calendar" },
          { label: EC_MONTHS[day.ec.m - 1], href: monthHref(day.ec.y, day.ec.m) },
          { label: dayJdn === now.jdn ? "Today" : gcShort(day), href: `#/day/${dayJdn}` },
          { label: task.title },
        ]}
      />

      <div className="glass panel">
        <span className="eyebrow">
          {task.isDefault ? "Default task" : bpId ? describeRule(task.rule) : "One-off"}
        </span>
        <h1 className="title" style={{ marginTop: 4 }}>{task.title}</h1>
        {task.titleAm ? (
          <div className="sub am" style={{ marginTop: 2 }}>{task.titleAm}</div>
        ) : null}

        <div className="split" style={{ marginTop: "var(--sp-5)" }}>
          <div className="kv">
            <span className="k">Planned</span>
            <span className="v">{fmtTime(task.startMin)}</span>
            <span className="sub">{fmtDur(task.duration ?? 0)}</span>
          </div>
          <div className="kv">
            <span className="k">Actual</span>
            <span className="v" style={entry?.actualMin != null ? undefined : { color: "var(--ink-4)" }}>
              {entry?.actualMin != null ? fmtTime(entry.actualMin) : "—"}
            </span>
            <span className="sub">
              {entry && driftedFromPlan(entry) ? "Different from plan" : "\u00a0"}
            </span>
          </div>
          <div className="kv">
            <span className="k">Logged</span>
            <span className="v" style={entry ? undefined : { color: "var(--ink-4)" }}>
              {entry?.loggedAtMin != null ? fmtTime(entry.loggedAtMin) : "—"}
            </span>
            <span className="sub">
              {entry && loggedLate(entry) ? "Entered on another day" : "\u00a0"}
            </span>
          </div>
        </div>

        {task.place ? (
          <div className="chips">
            <span className="chip">
              <Icon name="pin" size={12} />
              {task.place}
            </span>
            {bpId ? (
              <a className="chip" href={`#/blueprint/${bpId}`}>
                <Icon name="layers" size={12} />
                {ruleLabel(bpId)}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="glass panel">
        <h2 className="section">Did this happen?</h2>

        <div className="field">
          <label htmlFor="at">At what time</label>
          <input
            id="at"
            className="input"
            style={{ maxWidth: 140 }}
            value={atText ?? fmtTime(actualMin ?? task.startMin)}
            onChange={(e) => setAtText(e.target.value)}
            placeholder="HH:MM"
            inputMode="numeric"
          />
        </div>

        {!check.ok ? (
          <div className="warn" style={{ marginBottom: "var(--sp-4)" }}>
            <Icon name="warn" size={15} style={{ marginTop: 2 }} />
            <span>
              {check.reason} You can reschedule it instead — nothing is lost by moving it.
            </span>
          </div>
        ) : null}

        <div className="btnrow">
          <button
            className={`btn${st === STATUS.DONE ? " on" : ""}`}
            disabled={!check.ok}
            onClick={() => setStatus(STATUS.DONE)}
          >
            <Icon name="check" size={15} />
            Yes, I did this
          </button>
          <button
            className={`btn${st === STATUS.SKIPPED ? " on neutral" : ""}`}
            onClick={() => setStatus(STATUS.SKIPPED)}
          >
            <Icon name="cross" size={15} />
            No, I did not
          </button>
          <button
            className={`btn${st === STATUS.RESCHEDULED ? " on neutral" : ""}`}
            onClick={() => setStatus(STATUS.RESCHEDULED)}
          >
            <Icon name="repeat" size={15} />
            Moved it
          </button>
        </div>

        <p className="hint" style={{ marginTop: "var(--sp-3)", maxWidth: "54ch" }}>
          {st === STATUS.UNKNOWN
            ? "Right now this is blank, which means no information — not that you failed. Choosing again clears it back to blank."
            : "Choosing the same answer again clears it back to blank."}
        </p>

        <details className="disclosure" style={{ marginTop: "var(--sp-4)" }}>
          <summary>
            <Icon name="chevRight" size={13} className="chev" />
            Add a note
          </summary>
          <textarea
            className="textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What actually happened?"
          />
        </details>
      </div>

      {entry?.note ? <div className="note">{entry.note}</div> : null}

      {!task.isDefault ? (
        <div className="btnrow" style={{ marginTop: "var(--sp-4)" }}>
          <button
            className="btn"
            onClick={() => {
              planner.removeTask(task.id);
              window.location.hash = `#/day/${dayJdn}`;
            }}
          >
            <Icon name="trash" size={15} />
            Remove this task
          </button>
        </div>
      ) : (
        <div className="btnrow" style={{ marginTop: "var(--sp-4)" }}>
          <button className="btn" onClick={() => planner.toggleDefault(task.key)}>
            <Icon name="off" size={15} />
            {task.enabled === false ? "Turn back on" : "Turn this default off"}
          </button>
          <span className="hint">A default you turn off stays visible on its blueprint.</span>
        </div>
      )}

      <Foot
        theme={theme}
        onToggle={onToggle}
        links={[
          { href: `#/day/${dayJdn}`, label: "Back to the day", icon: "arrowLeft" },
          ...(bpId ? [{ href: `#/blueprint/${bpId}`, label: ruleLabel(bpId), icon: "layers" }] : []),
        ]}
      />
    </div>
  );
}

/* ── Add — minimal by default, detail behind a disclosure ────────────── */

function AddPage({ jdn, planner, now, theme, onToggle }) {
  const day = dayFromJdn(jdn);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("09:00");
  const [dur, setDur] = useState("30");
  const [freq, setFreq] = useState("once");
  const [place, setPlace] = useState("");
  const [kind, setKind] = useState("task");

  const compound = /\s(&|and|\+)\s/i.test(title);
  const startMin = parseTime(start);
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
      kind,
    });
    window.location.hash = `#/day/${jdn}`;
  };

  return (
    <div className="page">
      <Crumbs
        items={[
          { label: "Calendar", href: "#/calendar" },
          { label: EC_MONTHS[day.ec.m - 1], href: monthHref(day.ec.y, day.ec.m) },
          { label: jdn === now.jdn ? "Today" : gcShort(day), href: `#/day/${jdn}` },
          { label: "Add" },
        ]}
      />

      <form className="glass panel" onSubmit={submit}>
        <h1 className="title">Plan something</h1>
        <p className="sub" style={{ marginTop: 4, marginBottom: "var(--sp-5)" }}>
          <span className="am">
            {EC_M_AM[day.ec.m - 1]} {day.ec.d}
          </span>{" "}
          · {DOW[day.dow]} {day.gc.d} {GC_MONTHS[day.gc.m - 1]} {day.gc.y}
        </p>

        <div className="field">
          <label htmlFor="t">What</label>
          <input
            id="t"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="One activity"
            autoFocus
          />
          {compound ? (
            <span className="hint" style={{ color: "var(--rose)" }}>
              That looks like two activities. Split them — each one is its own task.
            </span>
          ) : null}
        </div>

        <div className="inline-fields">
          <div className="field">
            <label htmlFor="s">Starts</label>
            <input
              id="s"
              className="input"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              placeholder="HH:MM"
              inputMode="numeric"
            />
          </div>
          <div className="field">
            <label htmlFor="d">Minutes</label>
            <input
              id="d"
              className="input"
              value={dur}
              onChange={(e) => setDur(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
            />
          </div>
        </div>

        <details className="disclosure">
          <summary>
            <Icon name="chevRight" size={13} className="chev" />
            More options
          </summary>

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
                This will join the <strong>{describeRule(ruleFromFrequency(freq, day))}</strong>{" "}
                blueprint automatically.
              </span>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="p">Place</label>
            <input
              id="p"
              className="input"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="Home, office, market…"
            />
            <span className="hint">
              Naming places lets the planner see travel between them and reserve the time.
            </span>
          </div>

          <div className="field">
            <label>Kind</label>
            <div className="seg">
              {[
                ["task", "Task"],
                ["rest", "Rest"],
                ["travel", "Travel"],
              ].map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className={kind === k ? "on" : ""}
                  onClick={() => setKind(k)}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="hint">Rest and travel are real entries, not empty space.</span>
          </div>
        </details>

        <div className="btnrow" style={{ marginTop: "var(--sp-5)" }}>
          <button className="btn primary" type="submit" disabled={!valid}>
            <Icon name="plus" size={15} />
            Add to this day
          </button>
          <a className="linkline" href={`#/day/${jdn}`}>
            Cancel
          </a>
        </div>
      </form>

      <Foot
        theme={theme}
        onToggle={onToggle}
        links={[{ href: `#/day/${jdn}`, label: "Back to the day", icon: "arrowLeft" }]}
      />
    </div>
  );
}

/* ── Root ────────────────────────────────────────────────────────────── */

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
      page = <BlueprintsPage {...common} />;
      break;
    case "blueprint":
      page = <BlueprintPage id={route.id} {...common} />;
      break;
    case "task":
      page = <TaskPage id={route.id} jdn={route.jdn} {...common} />;
      break;
    default:
      page = <DayPage jdn={now.jdn} {...common} />;
  }

  return <div className="shell">{page}</div>;
}
