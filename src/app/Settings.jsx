/**
 * Preferences, and the demo data switch.
 *
 * The demo lives here rather than anywhere near normal use, because inventing
 * content the user did not create is the one thing this app must never do by
 * accident. It is explicit, labelled, and reversible.
 */

import Icon from "./Icon.jsx";
import { PROTOTYPES } from "./prototypes.js";

const Toggle = ({ on, onChange, label, hint }) => (
  <label className="pref">
    <span className="pref-text">
      <span className="pref-label">{label}</span>
      {hint ? <span className="pref-hint">{hint}</span> : null}
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`sw${on ? " on" : ""}`}
      onClick={() => onChange(!on)}
    >
      <span className="sw-knob" />
    </button>
  </label>
);

export default function Settings({ planner, Top, theme, onToggle }) {
  const s = planner.settings;
  const set = planner.setSetting;
  const hasData = planner.userTasks.length > 0 || planner.categories.length > 0;

  return (
    <div className="page">
      <Top back={{ href: "#/blueprints", label: "Blueprints" }} theme={theme} onToggle={onToggle} />

      <h1 className="title" style={{ marginBottom: "var(--sp-5)" }}>Settings</h1>

      <section className="prefs">
        <h2 className="section">The day</h2>

        <label className="pref">
          <span className="pref-text">
            <span className="pref-label">Day starts at</span>
            <span className="pref-hint">
              Dawn is the Ethiopian reckoning — 12 in the morning is 6:00 international.
            </span>
          </span>
          <select className="select" style={{ width: 150 }} value={s.dayStart}
            onChange={(e) => set("dayStart", e.target.value)}>
            <option value="dawn">Dawn (12)</option>
            <option value="midnight">Midnight</option>
          </select>
        </label>

        <Toggle
          label="Show yesterday and tomorrow"
          hint="Keeps the neighbouring days in the same timeline."
          on={s.neighbourDays}
          onChange={(v) => set("neighbourDays", v)}
        />

        <Toggle
          label="Confirm before changing day"
          hint="Scrolling past the edge asks first, so you cannot drift into another day."
          on={s.confirmDayChange}
          onChange={(v) => set("confirmDayChange", v)}
        />

        <Toggle
          label="Show elapsed time"
          hint="The water level behind the day."
          on={s.showWater}
          onChange={(v) => set("showWater", v)}
        />

        <Toggle
          label="Show seconds"
          on={s.showSeconds}
          onChange={(v) => set("showSeconds", v)}
        />

        <label className="pref">
          <span className="pref-text">
            <span className="pref-label">Ignore gaps under</span>
            <span className="pref-hint">Shorter than this is noise between tasks, not rest.</span>
          </span>
          <span className="stepbox">
            <input
              className="input"
              style={{ width: 68 }}
              value={s.gapThreshold}
              onChange={(e) => set("gapThreshold", Number(e.target.value.replace(/\D/g, "")) || 0)}
              inputMode="numeric"
              aria-label="Gap threshold in minutes"
            />
            <span className="dim">min</span>
          </span>
        </label>
      </section>

      <section className="prefs">
        <h2 className="section">What now shows</h2>

        <label className="pref">
          <span className="pref-text">
            <span className="pref-label">Past tasks</span>
            <span className="pref-hint">How many recent tasks sit beside today.</span>
          </span>
          <span className="stepbox">
            <input className="input" style={{ width: 56 }} value={s.pastCount} inputMode="numeric"
              aria-label="Past task count"
              onChange={(e) => set("pastCount", Math.min(6, Number(e.target.value.replace(/\D/g, "")) || 0))} />
          </span>
        </label>

        <label className="pref">
          <span className="pref-text">
            <span className="pref-label">Upcoming tasks</span>
          </span>
          <span className="stepbox">
            <input className="input" style={{ width: 56 }} value={s.futureCount} inputMode="numeric"
              aria-label="Upcoming task count"
              onChange={(e) => set("futureCount", Math.min(6, Number(e.target.value.replace(/\D/g, "")) || 0))} />
          </span>
        </label>
      </section>

      <section className="prefs">
        <h2 className="section">Demo content</h2>
        <p className="hint" style={{ marginBottom: "var(--sp-3)", maxWidth: "56ch" }}>
          Fills the app with example tasks and categories so the layout can be judged
          at real density. This is the only place anything is invented — nothing here
          appears unless you ask for it.
        </p>
        <div className="btnrow">
          <button className="btn" onClick={planner.loadDemo}>
            <Icon name="pattern" size={15} />
            Load demo content
          </button>
          <button className="btn" onClick={planner.clearAll} disabled={!hasData}>
            <Icon name="trash" size={15} />
            Clear everything
          </button>
        </div>
      </section>

      <section className="prefs">
        <h2 className="section">Prototypes</h2>
        <p className="hint" style={{ marginBottom: "var(--sp-3)" }}>
          Open design questions. Each shows the same thing built several ways — pick one
          and the rest get thrown away. They are also in Go anywhere: search “prototype”.
        </p>
        <div className="rows">
          {PROTOTYPES.map((p) => (
            <a className="row" key={p.id} href={`#/prototype/${p.id}/${p.variants[0][0]}`}>
              <span className="row-main">
                <span className="row-t">{p.title}</span>
                <span className="row-s">{p.question}</span>
              </span>
              <span className="dim">{p.variants.length} variants</span>
              <Icon name="chevRight" size={14} className="dim" />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
