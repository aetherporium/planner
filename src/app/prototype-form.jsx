/**
 * PROTOTYPE — throwaway. Delete once a variant wins.
 *
 * Question: "Creating a task needs date and frequency as REQUIREMENTS, not
 *            options, plus a description and the rest. What shape should the
 *            task form be?"
 *
 * Three variants at #/prototype/<A|B|C>, switchable from the floating bar.
 * All three collect the same fields and enforce the same requirements — they
 * disagree about the SHAPE of the asking, which is the actual question.
 *
 *   A — Ladder.   One long form, everything visible, grouped by heading.
 *                 Nothing hidden, nothing to discover. Long on a phone.
 *   B — Steps.    Three gates: what, when, details. You cannot pass a gate
 *                 with a requirement unmet, so the rules teach themselves.
 *   C — Sentence. The task is one plain sentence with the fields as blanks in
 *                 it. Reads back as English; tightest on space.
 */

import { useState } from "react";
import Icon from "./Icon.jsx";
import Mark from "./Mark.jsx";
import { parseEth, fromDawn, rulerHour } from "./format.js";
import { conflictsFor, isMoment, fmtDur } from "../log.mjs";
import { DOW, GC_MONTHS, dayFromJdn } from "../calendar.mjs";
import { colorOf, iconOf } from "../patterns.mjs";

const EC_M_AM = [
  "መስከረም", "ጥቅምት", "ኅዳር", "ታኅሣሥ", "ጥር", "የካቲት",
  "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ",
];

const FREQS = (day) => [
  ["once", "just once"],
  ["daily", "every day"],
  ["weekly", `every ${DOW[day.dow]}`],
  ["monthly", `day ${day.gc.d} each month`],
  ["ec-monthly", `day ${day.ec.d} each Ethiopian month`],
];

/** Shared state so the variants are compared fairly, not by their defaults. */
const useDraft = (now) => {
  const [v, setV] = useState({
    title: "",
    jdn: now.jdn,
    time: "2:00",
    night: false,
    dur: "30",
    freq: "",
    desc: "",
    place: "",
    categoryId: null,
  });
  const set = (k) => (val) => setV((s) => ({ ...s, [k]: val }));

  const startMin = parseEth(v.time, v.night);
  const compound = /\s(&|and|\+)\s/i.test(v.title);
  const missing = [];
  if (!v.title.trim()) missing.push("a name");
  if (startMin == null) missing.push("a time");
  if (!v.freq) missing.push("how often");            // REQUIRED
  if (!(Number(v.dur) >= 0)) missing.push("a length");
  return { v, set, setV, startMin, compound, missing, ok: missing.length === 0 && !compound };
};

const Req = () => <span className="req" title="Required">required</span>;

/**
 * The point of this form is SCHEDULING, so the day is drawn while you fill it
 * in: where the new block lands, what is already there, and what it hits.
 * Every variant carries it — the question is the shape of the form, not
 * whether you should be able to see what you are doing.
 */
function DayPreview({ draft, tasks, compact }) {
  const { startMin, v } = draft;
  const dur = Number(v.dur) || 0;
  const mine = startMin == null ? null : fromDawn(startMin);

  const blocks = tasks
    .filter((t) => t.startMin != null && !isMoment(t) && t.kind !== "tally")
    .map((t) => ({ ...t, from: fromDawn(t.startMin), to: fromDawn(t.startMin) + (t.duration ?? 0) }));

  const clashes =
    mine == null ? [] : conflictsFor(
      { startMin: mine, duration: dur, place: v.place.trim() || null },
      blocks.map((b) => ({ ...b, startMin: b.from })),
    );
  const hit = new Set(clashes.map((c) => c.task.id));
  const pc = (m) => `${(m / 1440) * 100}%`;

  return (
    <div className={`prev${compact ? " compact" : ""}`}>
      <div className="prev-head">
        <span>Your day</span>
        {mine != null && dur ? (
          <span className={clashes.length ? "prev-warn" : "prev-ok"}>
            {clashes.length
              ? `${clashes.length} clash${clashes.length > 1 ? "es" : ""}`
              : "Fits"}
          </span>
        ) : <span className="dim">Pick a time</span>}
      </div>

      <div className="prev-ruler">
        {[0, 6, 12, 18, 24].map((h) => (
          <span key={h} className="prev-tick" style={{ left: pc(h * 60) }}>
            {rulerHour(h * 60)}
          </span>
        ))}
      </div>

      <div className="prev-lane">
        {blocks.map((b) => (
          <span key={b.id}
            className={`prev-b${hit.has(b.id) ? " hit" : ""}`}
            style={{ left: pc(b.from), width: pc(Math.max(b.to - b.from, 8)) }}
            title={`${b.title} — ${fmtDur(b.duration ?? 0)}`}>
            <i>{b.title}</i>
          </span>
        ))}
        {mine != null ? (
          <span className={`prev-mine${clashes.length ? " clash" : ""}`}
            style={{ left: pc(mine), width: pc(Math.max(dur, 8)) }}>
            <i>{v.title.trim() || "New"}</i>
          </span>
        ) : null}
      </div>

      {clashes.length ? (
        <p className="prev-note">
          {clashes[0].kind === "tight"
            ? `Only ${clashes[0].minutes} min to get from ${clashes[0].from} to ${clashes[0].to}.`
            : `Overlaps ${clashes[0].task.title} by ${fmtDur(clashes[0].minutes)}.`}
        </p>
      ) : null}
    </div>
  );
}

function DatePick({ jdn, onChange }) {
  const d = dayFromJdn(jdn);
  return (
    <span className="datepick">
      <button type="button" className="stepper" onClick={() => onChange(jdn - 1)} aria-label="Previous day">
        <Icon name="chevLeft" size={14} />
      </button>
      <span className="datepick-v">
        <strong>{DOW[d.dow]} {d.gc.d} {GC_MONTHS[d.gc.m - 1].slice(0, 3)}</strong>
        <small className="am">{EC_M_AM[d.ec.m - 1]} {d.ec.d}</small>
      </span>
      <button type="button" className="stepper" onClick={() => onChange(jdn + 1)} aria-label="Next day">
        <Icon name="chevRight" size={14} />
      </button>
    </span>
  );
}

function TimePick({ time, night, onTime, onNight }) {
  return (
    <span className="timepick">
      <input className="input" style={{ width: 84 }} value={time} inputMode="numeric"
        onChange={(e) => onTime(e.target.value)} placeholder="2:00" aria-label="Time" />
      <span className="seg">
        <button type="button" className={!night ? "on" : ""} onClick={() => onNight(false)} aria-label="day">
          <Mark night={false} size={9} />
        </button>
        <button type="button" className={night ? "on" : ""} onClick={() => onNight(true)} aria-label="night">
          <Mark night size={9} />
        </button>
      </span>
    </span>
  );
}

function Cats({ categories, value, onChange }) {
  if (!categories.length) return <span className="dim">No categories yet — optional anyway.</span>;
  return (
    <span className="chips">
      {categories.map((c) => (
        <button key={c.id} type="button" style={{ "--c": colorOf(c.color) }}
          className={`chip pick${value === c.id ? " on" : ""}`}
          onClick={() => onChange(value === c.id ? null : c.id)}>
          <Icon name={iconOf(c.icon)} size={12} />
          {c.name}
        </button>
      ))}
    </span>
  );
}

/* ── A — Ladder ───────────────────────────────────────────────────────── */

function VariantA({ now, categories, tasks }) {
  const d = useDraft(now);
  return (
    <form className="glass panel" onSubmit={(e) => e.preventDefault()}>
      <DayPreview draft={d} tasks={tasks} />
      <h2 className="section">The task</h2>
      <div className="field">
        <label>Name <Req /></label>
        <input className="input" value={d.v.title} onChange={(e) => d.set("title")(e.target.value)}
          placeholder="One activity" />
        {d.compound ? <span className="hint" style={{ color: "var(--rose)" }}>
          That is two activities — split them.</span> : null}
      </div>
      <div className="field">
        <label>Description</label>
        <textarea className="textarea" value={d.v.desc} onChange={(e) => d.set("desc")(e.target.value)}
          placeholder="What it involves, why it matters, anything you want to remember." />
      </div>

      <h2 className="section" style={{ marginTop: "var(--sp-5)" }}>When</h2>
      <div className="field">
        <label>Date <Req /></label>
        <DatePick jdn={d.v.jdn} onChange={d.set("jdn")} />
      </div>
      <div className="inline-fields">
        <div className="field">
          <label>Starts <Req /></label>
          <TimePick time={d.v.time} night={d.v.night} onTime={d.set("time")} onNight={d.set("night")} />
        </div>
        <div className="field">
          <label>Minutes <Req /></label>
          <input className="input" value={d.v.dur} inputMode="numeric"
            onChange={(e) => d.set("dur")(e.target.value.replace(/\D/g, ""))} />
          <span className="hint">0 means a moment, like waking.</span>
        </div>
      </div>
      <div className="field">
        <label>How often <Req /></label>
        <select className="select" value={d.v.freq} onChange={(e) => d.set("freq")(e.target.value)}>
          <option value="">Choose…</option>
          {FREQS(dayFromJdn(d.v.jdn)).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>

      <h2 className="section" style={{ marginTop: "var(--sp-5)" }}>Extras</h2>
      <div className="field">
        <label>Place</label>
        <input className="input" value={d.v.place} onChange={(e) => d.set("place")(e.target.value)}
          placeholder="Home, school, market…" />
      </div>
      <div className="field">
        <label>Category</label>
        <Cats categories={categories} value={d.v.categoryId} onChange={d.set("categoryId")} />
      </div>

      <Bar d={d} />
    </form>
  );
}

/* ── B — Steps ────────────────────────────────────────────────────────── */

function VariantB({ now, categories, tasks }) {
  const d = useDraft(now);
  const [step, setStep] = useState(0);

  const gates = [
    !d.v.title.trim() || d.compound,
    d.startMin == null || !d.v.freq,
    false,
  ];
  const titles = ["What is it?", "When does it happen?", "Anything else?"];

  return (
    <form className="glass panel" onSubmit={(e) => e.preventDefault()}>
      <div className="steps">
        {titles.map((t, i) => (
          <button key={t} type="button" className={`step${i === step ? " on" : ""}${i < step ? " done" : ""}`}
            onClick={() => i <= step && setStep(i)} disabled={i > step}>
            <span className="step-n">{i < step ? <Icon name="check" size={12} /> : i + 1}</span>
            {t}
          </button>
        ))}
      </div>

      {step === 0 ? (
        <>
          <div className="field">
            <label>Name <Req /></label>
            <input className="input" autoFocus value={d.v.title} placeholder="One activity"
              onChange={(e) => d.set("title")(e.target.value)} />
            {d.compound ? <span className="hint" style={{ color: "var(--rose)" }}>
              That is two activities — split them.</span> : null}
          </div>
          <div className="field">
            <label>Description</label>
            <textarea className="textarea" value={d.v.desc}
              onChange={(e) => d.set("desc")(e.target.value)} placeholder="Optional notes." />
          </div>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <DayPreview draft={d} tasks={tasks} />
          <div className="field">
            <label>Date <Req /></label>
            <DatePick jdn={d.v.jdn} onChange={d.set("jdn")} />
          </div>
          <div className="inline-fields">
            <div className="field">
              <label>Starts <Req /></label>
              <TimePick time={d.v.time} night={d.v.night} onTime={d.set("time")} onNight={d.set("night")} />
            </div>
            <div className="field">
              <label>Minutes <Req /></label>
              <input className="input" value={d.v.dur} inputMode="numeric"
                onChange={(e) => d.set("dur")(e.target.value.replace(/\D/g, ""))} />
            </div>
          </div>
          <div className="field">
            <label>How often <Req /></label>
            <div className="chips">
              {FREQS(dayFromJdn(d.v.jdn)).map(([k, l]) => (
                <button key={k} type="button" className={`chip pick${d.v.freq === k ? " on" : ""}`}
                  onClick={() => d.set("freq")(k)}>{l}</button>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <div className="field">
            <label>Place</label>
            <input className="input" value={d.v.place} onChange={(e) => d.set("place")(e.target.value)}
              placeholder="Home, school, market…" />
          </div>
          <div className="field">
            <label>Category</label>
            <Cats categories={categories} value={d.v.categoryId} onChange={d.set("categoryId")} />
          </div>
        </>
      ) : null}

      <div className="btnrow" style={{ marginTop: "var(--sp-5)" }}>
        {step > 0 ? (
          <button className="btn" type="button" onClick={() => setStep(step - 1)}>Back</button>
        ) : null}
        {step < 2 ? (
          <button className="btn primary" type="button" disabled={gates[step]}
            onClick={() => setStep(step + 1)}>
            Next <Icon name="chevRight" size={14} />
          </button>
        ) : (
          <button className="btn primary" type="button" disabled={!d.ok}>
            <Icon name="plus" size={15} /> Add
          </button>
        )}
        {gates[step] ? <span className="hint">Fill the required fields to continue.</span> : null}
      </div>
    </form>
  );
}

/* ── C — Sentence ─────────────────────────────────────────────────────── */

function VariantC({ now, categories, tasks }) {
  const d = useDraft(now);
  const day = dayFromJdn(d.v.jdn);
  return (
    <form className="glass panel" onSubmit={(e) => e.preventDefault()}>
      <DayPreview draft={d} tasks={tasks} compact />
      <p className="sentence">
        I want to{" "}
        <input className="blank wide" value={d.v.title} placeholder="do what?"
          onChange={(e) => d.set("title")(e.target.value)} />{" "}
        on{" "}
        <DatePick jdn={d.v.jdn} onChange={d.set("jdn")} />{" "}
        at{" "}
        <TimePick time={d.v.time} night={d.v.night} onTime={d.set("time")} onNight={d.set("night")} />{" "}
        for{" "}
        <input className="blank tiny" value={d.v.dur} inputMode="numeric"
          onChange={(e) => d.set("dur")(e.target.value.replace(/\D/g, ""))} />{" "}
        minutes,{" "}
        <select className="blank sel" value={d.v.freq} onChange={(e) => d.set("freq")(e.target.value)}>
          <option value="">how often?</option>
          {FREQS(day).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        {", at "}
        <input className="blank" value={d.v.place} placeholder="somewhere"
          onChange={(e) => d.set("place")(e.target.value)} />.
      </p>

      <p className="hint" style={{ marginTop: "var(--sp-3)" }}>
        The blanks in bold are <span className="req">required</span> — a task needs a name, a
        date, a time and a frequency before it can exist.
      </p>

      <details className="disclosure" open>
        <summary><Icon name="chevRight" size={13} className="chev" /> Description and category</summary>
        <textarea className="textarea" value={d.v.desc} placeholder="Anything worth remembering."
          onChange={(e) => d.set("desc")(e.target.value)} />
        <div style={{ marginTop: "var(--sp-3)" }}>
          <Cats categories={categories} value={d.v.categoryId} onChange={d.set("categoryId")} />
        </div>
      </details>

      <Bar d={d} />
    </form>
  );
}

function Bar({ d }) {
  return (
    <div className="btnrow" style={{ marginTop: "var(--sp-5)" }}>
      <button className="btn primary" type="button" disabled={!d.ok}>
        <Icon name="plus" size={15} /> Add
      </button>
      {d.missing.length ? (
        <span className="hint">Still needs {d.missing.join(", ")}.</span>
      ) : (
        <span className="hint">Ready.</span>
      )}
    </div>
  );
}

export default function FormPrototype({ variant = "A", planner, now }) {
  const V = { A: VariantA, B: VariantB, C: VariantC }[variant] ?? VariantA;
  return <V now={now} categories={planner.categories} tasks={planner.tasksFor(now.jdn)} />;
}
