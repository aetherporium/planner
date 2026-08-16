/**
 * PROTOTYPE — throwaway. Delete once a variant wins.
 *
 * Question: a month grid is good for "which Saturday", and bad for "what is
 *           actually happening". A list of days answers the second. Which
 *           should the calendar be, and how do the two live together?
 *
 *   A — Grid.      What exists today. Dense, spatial, weekday columns.
 *   B — Day list.  Every row a day, a preview of that day beside it.
 *   C — Both.      A toggle, remembering which you last used.
 */

import { useState } from "react";
import Icon from "./Icon.jsx";
import { Time } from "./Mark.jsx";
import { ecMonthDays, DOW, GC_MONTHS } from "../calendar.mjs";
import { fmtDur, isMoment } from "../log.mjs";

const EC_M_AM = [
  "መስከረም", "ጥቅምት", "ኅዳር", "ታኅሣሥ", "ጥር", "የካቲት",
  "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ",
];
const DOW_AM_2 = ["እሑ", "ሰኞ", "ማክ", "ረቡ", "ሐሙ", "ዓር", "ቅዳ"];

const Head = ({ view }) => (
  <div className="cal-head">
    <h2 className="section" style={{ margin: 0 }}>
      <span className="am">{EC_M_AM[view.m - 1]}</span> <span className="dim">{view.y}</span>
    </h2>
  </div>
);

/* A — the grid we already have */
function Grid({ days, lead, now }) {
  return (
    <div className="cal-grid">
      {DOW_AM_2.map((d, i) => <div key={d} className="cal-dow am" title={DOW[i]}>{d}</div>)}
      {Array.from({ length: lead }, (_, i) => <div key={`b${i}`} className="cell blank" />)}
      {days.map((d) => (
        <span key={d.jdn}
          className={`cell${d.jdn === now.jdn ? " today" : ""}${d.dow === 0 || d.dow === 6 ? " weekend" : ""}${d.holidays.length ? " hol" : ""}`}>
          <span className="ec am">{d.ec.d}</span>
          <span className="gc">{d.gc.d}</span>
        </span>
      ))}
    </div>
  );
}

/* B — every row a day, with what is on it */
function DayList({ days, now, tasksFor, sel, setSel }) {
  const day = days.find((d) => d.jdn === sel) ?? days[0];
  const tasks = tasksFor(day.jdn);

  return (
    <div className="dl">
      <div className="dl-rows">
        {days.map((d) => {
          const ts = tasksFor(d.jdn);
          const load = ts.reduce((n, t) => n + (t.duration ?? 0), 0);
          return (
            <button key={d.jdn} type="button"
              className={`dl-row${d.jdn === sel ? " on" : ""}${d.jdn === now.jdn ? " today" : ""}`}
              onClick={() => setSel(d.jdn)}>
              <span className="dl-d">
                <b>{d.ec.d}</b>
                <small>{DOW[d.dow].slice(0, 3)}</small>
              </span>
              <span className="dl-mid">
                <span className="dl-names">
                  {ts.length ? ts.slice(0, 3).map((t) => t.title).join(" · ") : "—"}
                  {ts.length > 3 ? ` +${ts.length - 3}` : ""}
                </span>
                {/* the day at a glance, drawn to scale */}
                <span className="dl-bar">
                  {ts.map((t) => (
                    <span key={t.id}
                      className={isMoment(t) ? "dl-mo" : "dl-b"}
                      style={{
                        left: `${((t.startMin ?? 0) / 1440) * 100}%`,
                        width: `${((t.duration ?? 0) / 1440) * 100}%`,
                      }} />
                  ))}
                </span>
              </span>
              <span className="dl-load">{load ? fmtDur(load) : ""}</span>
              {d.holidays.length ? <Icon name="star" size={12} className="dl-hol" /> : null}
            </button>
          );
        })}
      </div>

      {/* the preview, beside the list rather than replacing it */}
      <aside className="dl-prev">
        <div className="dl-prev-h">
          <strong>{DOW[day.dow]} {day.gc.d} {GC_MONTHS[day.gc.m - 1]}</strong>
          <span className="am dim">{EC_M_AM[day.ec.m - 1]} {day.ec.d}</span>
        </div>
        {day.holidays.length ? <div className="dh-hol">{day.holidays.join(" · ")}</div> : null}
        {tasks.length ? (
          <div className="sched">
            {tasks.map((t) => (
              <span className="slot" key={t.id}>
                <span className="slot-t"><Time min={t.startMin} size={6} /></span>
                {isMoment(t) ? <span className="slot-moment" />
                  : <span className="slot-bar" style={{ "--w": Math.min(100, (t.duration ?? 0) / 4.5) }} />}
                <span className="slot-n">{t.title}</span>
                <span className="slot-d">{isMoment(t) ? "moment" : fmtDur(t.duration ?? 0)}</span>
              </span>
            ))}
          </div>
        ) : <p className="empty">Nothing planned.</p>}
      </aside>
    </div>
  );
}

export default function CalViewPrototype({ variant = "A", planner, now }) {
  const today = { y: 2018, m: 12 };
  const [view] = useState(today);
  const [mode, setMode] = useState("list");
  const [sel, setSel] = useState(now.jdn);

  const days = ecMonthDays(view.y, view.m);
  const lead = days.length ? days[0].dow : 0;

  return (
    <>
      <Head view={view} />

      {variant === "C" ? (
        <div className="seg" style={{ marginBottom: "var(--sp-4)" }}>
          <button className={mode === "grid" ? "on" : ""} onClick={() => setMode("grid")}>
            <Icon name="calendar" size={13} /> Month
          </button>
          <button className={mode === "list" ? "on" : ""} onClick={() => setMode("list")}>
            <Icon name="list" size={13} /> Days
          </button>
        </div>
      ) : null}

      {variant === "A" || (variant === "C" && mode === "grid") ? (
        <Grid days={days} lead={lead} now={now} />
      ) : (
        <DayList days={days} now={now} tasksFor={planner.tasksFor} sel={sel} setSel={setSel} />
      )}

      <p className="hint proto-note">
        {variant === "A"
          ? "Spatial: good for “which Saturday”, poor for “what is happening”."
          : variant === "B"
            ? "Every row a day, preview beside it. Answers “what is happening”, loses the week shape."
            : "Both, with the choice remembered. Costs a control and a decision."}
      </p>
    </>
  );
}
