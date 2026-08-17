/**
 * Editing a task — the shape of the plan, not the record of doing it.
 *
 * These are two different jobs and they were tangled together. Opening a task
 * from Blueprints used to land on the day page, which is where you tick a
 * thing off, add an amount, mark it skipped. But Blueprints is the list of
 * what you have *planned*: what belongs there is changing the plan — the time
 * it starts, how long it takes, how often it repeats, which days it should
 * skip, and whether it should exist at all.
 *
 * So: logging stays on the day. This is where the task itself is changed.
 *
 * Blocked dates are the interesting part. Cancelling one Tuesday should not
 * mean redefining "every Tuesday", so a blocked date is kept as an exception
 * beside the rule rather than folded into it. The rule stays honest and the
 * exception stays visible and reversible.
 */

import { useState } from "react";
import Icon from "./Icon.jsx";
import Mark from "./Mark.jsx";
import Popup from "./Popup.jsx";
import MiniCalendar from "./MiniCalendar.jsx";
import { t12, parseEth, isNight, parts } from "./format.js";
import { fmtDur, isMoment } from "../log.mjs";
import { patternName } from "../patterns.mjs";
import { ruleFromFrequency } from "../blueprint.mjs";
import { dayFromJdn, iso, GC_MONTHS } from "../calendar.mjs";

const FREQS = [
  ["once", "Once"],
  ["daily", "Every day"],
  ["weekly", "Every week"],
  ["monthly", "Every month"],
  ["ec-monthly", "Every Ethiopian month"],
];

/** Which frequency a rule came from, so the form opens on what is true. */
const freqOfRule = (rule) => {
  if (!rule) return "once";
  if (rule.kind === "everyday") return "daily";
  if (rule.kind === "dow") return "weekly";
  if (rule.kind === "gc-monthday") return "monthly";
  if (rule.kind === "ec-monthday") return "ec-monthly";
  return "custom";
};

export default function TaskEdit({ task, planner, now, onClose }) {
  const p = parts(task.startMin);
  const [title, setTitle] = useState(task.title ?? "");
  const [desc, setDesc] = useState(task.desc ?? "");
  const [start, setStart] = useState(`${p.h}:${String(p.m).padStart(2, "0")}`);
  const [night, setNight] = useState(isNight(task.startMin));
  const [dur, setDur] = useState(String(task.duration ?? 0));
  const [place, setPlace] = useState(task.place ?? "");
  const [freq, setFreq] = useState(freqOfRule(task.rule));
  const [picking, setPicking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const blocked = task.blocked ?? [];
  const isDefault = task.isDefault === true;

  const save = () => {
    const startMin = parseEth(start, night);
    const patch = {
      title: title.trim() || task.title,
      desc: desc.trim() || null,
      duration: Math.max(0, Number(dur) || 0),
      place: place.trim() || null,
    };
    if (Number.isFinite(startMin)) patch.startMin = startMin;

    // "custom" means a rule this form cannot express — leave it alone.
    if (freq !== "custom" && freq !== freqOfRule(task.rule)) {
      patch.rule = ruleFromFrequency(freq, dayFromJdn(now.jdn));
    }
    planner.updateTask(task.id, patch);
    onClose();
  };

  const remove = () => {
    if (isDefault) {
      // A built-in is turned off rather than deleted: it is defined in code
      // and would simply come back on the next load.
      planner.toggleDefault(task.id);
    } else {
      planner.removeTask(task.id);
    }
    onClose();
  };

  return (
    <>
      <Popup
        size="wide"
        title={`Edit ${task.title}`}
        sub={task.rule ? patternName(task.rule) : "Once"}
        onClose={onClose}
        footer={
          <div className="edit-foot">
            <button type="button" className="btn danger" onClick={() => setConfirmDelete(true)}>
              <Icon name="trash" size={14} />
              {isDefault ? "Turn off" : "Delete"}
            </button>
            <span className="grow" />
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="button" className="btn primary" onClick={save}>Save</button>
          </div>
        }
      >
        <div className="edit-grid">
          <div className="field">
            <label htmlFor="et">Name</label>
            <input id="et" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="ed">Description</label>
            <input
              id="ed"
              className="input"
              value={desc}
              placeholder="What it actually involves"
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>

          <div className="inline-fields">
            <div className="field">
              <label htmlFor="es">Starts</label>
              <span className="timepick">
                <input
                  id="es"
                  className="input"
                  style={{ width: 88 }}
                  value={start}
                  inputMode="numeric"
                  onChange={(e) => setStart(e.target.value)}
                />
                <span className="seg">
                  <button type="button" className={!night ? "on" : ""} onClick={() => setNight(false)}
                    aria-label="day" title="day"><Mark night={false} size={9} /></button>
                  <button type="button" className={night ? "on" : ""} onClick={() => setNight(true)}
                    aria-label="night" title="night"><Mark night size={9} /></button>
                </span>
              </span>
            </div>

            <div className="field">
              <label htmlFor="em">Minutes</label>
              <input id="em" className="input" value={dur} inputMode="numeric"
                onChange={(e) => setDur(e.target.value)} />
              <span className="hint">{isMoment({ duration: Number(dur) || 0 }) ? "a moment" : fmtDur(Number(dur) || 0)}</span>
            </div>

            <div className="field">
              <label htmlFor="ep">Place</label>
              <input id="ep" className="input" value={place} onChange={(e) => setPlace(e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="ef">Repeats</label>
            <select id="ef" className="input" value={freq} onChange={(e) => setFreq(e.target.value)}>
              {freq === "custom" ? <option value="custom">{patternName(task.rule)}</option> : null}
              {FREQS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </div>

          {/* ── Exceptions ──────────────────────────────────────────────── */}
          <div className="field">
            <label>
              Skipped dates
              <span className="hint"> — the pattern holds, these days do not</span>
            </label>
            <div className="blocks">
              {blocked.length === 0 ? (
                <span className="dim">None</span>
              ) : (
                blocked.slice().sort().map((d) => {
                  const [yy, mm, dd] = d.split("-").map(Number);
                  return (
                    <button
                      key={d}
                      type="button"
                      className="block-chip"
                      title="Unblock this date"
                      onClick={() => planner.toggleBlocked(task.id, d)}
                    >
                      {dd} {GC_MONTHS[mm - 1].slice(0, 3)} {yy}
                      <Icon name="cross" size={11} />
                    </button>
                  );
                })
              )}
              <button type="button" className="btn small" onClick={() => setPicking(true)}>
                <Icon name="calendar" size={13} />
                Block a date
              </button>
            </div>
          </div>
        </div>
      </Popup>

      {picking ? (
        <Popup size="wide" title="Block a date" sub={task.title} onClose={() => setPicking(false)}>
          <MiniCalendar
            now={now}
            focus={dayFromJdn(now.jdn)}
            onPick={(j) => {
              planner.toggleBlocked(task.id, iso(dayFromJdn(j).gc));
              setPicking(false);
            }}
          />
        </Popup>
      ) : null}

      {confirmDelete ? (
        <Popup
          title={isDefault ? `Turn off ${task.title}?` : `Delete ${task.title}?`}
          onClose={() => setConfirmDelete(false)}
          footer={
            <div className="edit-foot">
              <span className="grow" />
              <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>Keep</button>
              <button type="button" className="btn danger" onClick={remove}>
                {isDefault ? "Turn off" : "Delete"}
              </button>
            </div>
          }
        >
          <p className="hint">
            {isDefault
              ? "A built-in task is switched off rather than removed, so you can turn it back on later."
              : "This removes the task and everything logged against it. It cannot be undone."}
          </p>
        </Popup>
      ) : null}
    </>
  );
}
