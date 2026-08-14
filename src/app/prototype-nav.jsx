/**
 * PROTOTYPE — throwaway. Not production. Delete once a variant wins.
 *
 * Question: "The current directory-style navigation isn't going to cut it.
 *            What should navigation be instead?"
 *
 * Three variants of the navigation system, switchable via `#/prototype/<A|B|C>`
 * and the floating bar at the bottom. Each is mounted around the REAL day page
 * with the user's real tasks, because navigation only reveals its problems when
 * it is butting up against real content density.
 *
 * The variants disagree structurally — they are not three skins:
 *   A — Adjacency. No menu at all. The day's own edges are the doors: the
 *       previous and next day sit above and below the timeline as real content
 *       you scroll into, and a task's pattern is reached by pulling sideways.
 *   B — Summon. Navigation has no permanent home. One key, or one thumb press,
 *       raises a search field that goes anywhere by name — a date, a task, a
 *       pattern, a category.
 *   C — Orbit. A single persistent anchor at the thumb. Pressing it fans the
 *       three destinations out around it; they are always in the same place, so
 *       it becomes muscle memory.
 */

import { useState, useEffect, useMemo, useRef } from "react";
import Icon from "./Icon.jsx";
import Clock from "./Clock.jsx";
import Timeline from "./Timeline.jsx";
import { Time } from "./Mark.jsx";
import { dayFromJdn, GC_MONTHS, DOW, EC_MONTHS } from "../calendar.mjs";
import { patternsIn } from "../patterns.mjs";
import { fmtDur } from "../log.mjs";

const EC_M_AM = [
  "መስከረም", "ጥቅምት", "ኅዳር", "ታኅሣሥ", "ጥር", "የካቲት",
  "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ",
];

const VARIANTS = [
  ["A", "Adjacency — the day's edges are the doors"],
  ["B", "Summon — type to go anywhere"],
  ["C", "Orbit — one anchor, three spokes"],
];

/* The day itself, shared by all three so only navigation differs. */
function DayBody({ planner, now, jdn, compact }) {
  const day = dayFromJdn(jdn);
  const isToday = jdn === now.jdn;
  return (
    <>
      <header className="dayhead glass">
        <Clock minutes={isToday ? now.minutes : 0} seconds={isToday ? now.seconds : 0} size={compact ? 62 : 78} />
        <div className="grow">
          <h1 className="title">{isToday ? "Today" : DOW[day.dow]}</h1>
          <div className="dual">
            <span className="am">{EC_M_AM[day.ec.m - 1]} {day.ec.d}, {day.ec.y}</span>
            <span className="dot">·</span>
            <span>{DOW[day.dow]} {day.gc.d} {GC_MONTHS[day.gc.m - 1]} {day.gc.y}</span>
          </div>
        </div>
      </header>
      <Timeline
        timeline={planner.timelineFor(jdn)}
        jdn={jdn}
        nowMin={now.minutes}
        isToday={isToday}
        statusFor={planner.statusFor}
        height={compact ? 360 : 430}
      />
    </>
  );
}

/* ── A — Adjacency ────────────────────────────────────────────────────── */
/* There is no navigation UI. Neighbouring days are literally adjacent: you
   scroll up into yesterday and down into tomorrow. The month is reached by
   pulling the date, patterns by pulling a task sideways. Nothing to learn,
   nothing on screen, but everything is more than one gesture away. */

function VariantA({ planner, now }) {
  const [jdn, setJdn] = useState(now.jdn);
  const d = dayFromJdn(jdn);
  const prev = dayFromJdn(jdn - 1);
  const next = dayFromJdn(jdn + 1);

  return (
    <div className="pv">
      <button className="adj adj-top" onClick={() => setJdn((j) => j - 1)}>
        <Icon name="chevLeft" size={14} style={{ transform: "rotate(90deg)" }} />
        <span>{DOW[prev.dow]} {prev.gc.d} {GC_MONTHS[prev.gc.m - 1].slice(0, 3)}</span>
        <span className="adj-hint">scroll up</span>
      </button>

      <DayBody planner={planner} now={now} jdn={jdn} />

      <button className="adj adj-bot" onClick={() => setJdn((j) => j + 1)}>
        <Icon name="chevRight" size={14} style={{ transform: "rotate(90deg)" }} />
        <span>{DOW[next.dow]} {next.gc.d} {GC_MONTHS[next.gc.m - 1].slice(0, 3)}</span>
        <span className="adj-hint">scroll down</span>
      </button>

      <div className="adj-side">
        <span className="adj-hint">pull the date for {EC_MONTHS[d.ec.m - 1]} · pull a task for its pattern</span>
      </div>
    </div>
  );
}

/* ── B — Summon ───────────────────────────────────────────────────────── */
/* Navigation is invisible until asked for. Press "/" or the thumb button and a
   field takes over; type a day, a task, a pattern, a category. Fast for anyone
   who knows what they want, opaque for anyone who does not. */

function VariantB({ planner, now }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [jdn, setJdn] = useState(now.jdn);
  const inputRef = useRef(null);

  const targets = useMemo(() => {
    const out = [];
    for (let i = -3; i <= 7; i++) {
      const d = dayFromJdn(now.jdn + i);
      out.push({
        kind: "Day",
        label: i === 0 ? "Today" : `${DOW[d.dow]} ${d.gc.d} ${GC_MONTHS[d.gc.m - 1]}`,
        sub: `${EC_M_AM[d.ec.m - 1]} ${d.ec.d}`,
        am: true,
        go: () => setJdn(d.jdn),
      });
    }
    for (const t of planner.allTasks) {
      out.push({ kind: "Task", label: t.title, sub: fmtDur(t.duration ?? 0), go: () => {} });
    }
    for (const p of patternsIn(planner.allTasks.filter((t) => t.rule))) {
      out.push({ kind: "Pattern", label: p.name, sub: p.cadence, go: () => {} });
    }
    for (const c of planner.categories) {
      out.push({ kind: "Category", label: c.name, sub: "", go: () => {} });
    }
    return out;
  }, [planner.allTasks, planner.categories, now.jdn]);

  const hits = q.trim()
    ? targets.filter((t) => t.label.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8)
    : targets.slice(0, 6);

  useEffect(() => {
    const on = (e) => {
      const tag = document.activeElement?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div className="pv">
      <DayBody planner={planner} now={now} jdn={jdn} />

      <button className="summon" onClick={() => setOpen(true)}>
        <Icon name="search" size={15} />
        <span>Go anywhere</span>
        <kbd>/</kbd>
      </button>

      {open ? (
        <div className="sum-scrim" onClick={() => setOpen(false)}>
          <div className="sum glass" onClick={(e) => e.stopPropagation()}>
            <div className="sum-field">
              <Icon name="search" size={17} className="dim" />
              <input
                ref={inputRef}
                className="sum-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="A day, a task, a pattern…"
              />
              <kbd>esc</kbd>
            </div>
            <div className="sum-list">
              {hits.length ? (
                hits.map((h, i) => (
                  <button key={i} className="sum-hit" onClick={() => { h.go(); setOpen(false); setQ(""); }}>
                    <span className="sum-kind">{h.kind}</span>
                    <span className={`sum-label${h.am ? "" : ""}`}>{h.label}</span>
                    <span className={`sum-sub${h.am ? " am" : ""}`}>{h.sub}</span>
                  </button>
                ))
              ) : (
                <div className="sum-none">Nothing matches “{q}”.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ── C — Orbit ────────────────────────────────────────────────────────── */
/* One anchor, always in the same spot at the thumb. Pressing it fans out the
   three destinations on fixed arcs, so their positions never move and become
   muscle memory. Costs one permanent dot of screen furniture. */

function VariantC({ planner, now }) {
  const [open, setOpen] = useState(false);
  const [jdn, setJdn] = useState(now.jdn);

  const spokes = [
    { icon: "day", label: "Today", angle: 200, on: () => setJdn(now.jdn) },
    { icon: "calendar", label: "Calendar", angle: 250, on: () => {} },
    { icon: "pattern", label: "Blueprints", angle: 300, on: () => {} },
  ];

  return (
    <div className="pv">
      <DayBody planner={planner} now={now} jdn={jdn} compact />

      <div className={`orbit${open ? " open" : ""}`}>
        {spokes.map((s, i) => {
          const a = (s.angle * Math.PI) / 180;
          return (
            <button
              key={s.label}
              className="spoke"
              style={{
                transform: open
                  ? `translate(${Math.cos(a) * 78}px, ${Math.sin(a) * 78}px)`
                  : "translate(0,0) scale(0.4)",
                transitionDelay: `${open ? i * 35 : 0}ms`,
              }}
              onClick={() => { s.on(); setOpen(false); }}
              tabIndex={open ? 0 : -1}
            >
              <Icon name={s.icon} size={17} />
              <span className="spoke-l">{s.label}</span>
            </button>
          );
        })}
        <button
          className="anchor"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close navigation" : "Open navigation"}
        >
          <Icon name={open ? "cross" : "plus"} size={19} />
        </button>
      </div>
    </div>
  );
}

/* ── Switcher ─────────────────────────────────────────────────────────── */

function Switcher({ current }) {
  const i = VARIANTS.findIndex(([k]) => k === current);
  const at = (n) => `#/prototype/${VARIANTS[(n + VARIANTS.length) % VARIANTS.length][0]}`;

  useEffect(() => {
    const on = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable) return;
      if (e.key === "ArrowLeft") window.location.hash = at(i - 1);
      if (e.key === "ArrowRight") window.location.hash = at(i + 1);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [i]);

  return (
    <div className="switcher">
      <a className="sw-arrow" href={at(i - 1)} aria-label="Previous variant">
        <Icon name="chevLeft" size={15} />
      </a>
      <span className="sw-label">
        <strong>{VARIANTS[i][0]}</strong> {VARIANTS[i][1]}
      </span>
      <a className="sw-arrow" href={at(i + 1)} aria-label="Next variant">
        <Icon name="chevRight" size={15} />
      </a>
    </div>
  );
}

export default function NavPrototype({ variant = "A", planner, now }) {
  const V = { A: VariantA, B: VariantB, C: VariantC }[variant] ?? VariantA;
  return (
    <div className="shell proto">
      <div className="proto-tag">
        Prototype · navigation · throwaway
      </div>
      <V planner={planner} now={now} />
      <Switcher current={VARIANTS.some(([k]) => k === variant) ? variant : "A"} />
    </div>
  );
}
