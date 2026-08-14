/**
 * The day header.
 *
 * No card, no border, no panel — it sits directly on the page. A large numbered
 * analog face on the left; to its right the date block, with the digital time
 * as a small chip tucked beside the weekday, deliberately much smaller than the
 * clock so the face is what you read first.
 */

import Mark from "./Mark.jsx";
import { parts } from "./format.js";
import { DOW, GC_MONTHS } from "../calendar.mjs";

const EC_M_AM = [
  "መስከረም", "ጥቅምት", "ኅዳር", "ታኅሣሥ", "ጥር", "የካቲት",
  "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ",
];

const hand = (deg, len, c = 100) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: c + Math.cos(a) * len, y: c + Math.sin(a) * len };
};

/** The big face. Numbered 12, 1, 2 … because it reads the Ethiopian hour. */
function Face({ minutes, seconds, size }) {
  const p = parts(minutes);
  const m = minutes % 60;
  const hp = hand((p.h % 12) * 30 + (m / 60) * 30, 52);
  const mp = hand((m + seconds / 60) * 6, 74);
  const sp = hand(seconds * 6, 80);

  return (
    <svg
      className="face"
      width={size}
      height={size}
      viewBox="0 0 200 200"
      aria-label={`${p.h}:${String(p.m).padStart(2, "0")} ${p.night ? "night" : "day"}`}
    >
      <circle cx="100" cy="100" r="96" fill="var(--surface-2)" stroke="var(--line)" strokeWidth="1" />

      {/* minute ticks */}
      {Array.from({ length: 60 }, (_, i) => {
        if (i % 5 === 0) return null;
        const a = hand(i * 6, 92);
        const b = hand(i * 6, 88);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--line-strong)" strokeWidth="1" />;
      })}

      {/* the numbers — 12 at the top, which is dawn */}
      {Array.from({ length: 12 }, (_, i) => {
        const n = i === 0 ? 12 : i;
        const pos = hand(i * 30, 74);
        return (
          <text
            key={n}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={i % 3 === 0 ? "var(--ink-2)" : "var(--ink-3)"}
            fontSize={i % 3 === 0 ? 19 : 16}
            fontWeight={i % 3 === 0 ? 600 : 400}
            fontFamily="var(--sans)"
          >
            {n}
          </text>
        );
      })}

      <line x1="100" y1="100" x2={hp.x} y2={hp.y} stroke="var(--ink)" strokeWidth="6" strokeLinecap="round" />
      <line x1="100" y1="100" x2={mp.x} y2={mp.y} stroke="var(--ink)" strokeWidth="3.6" strokeLinecap="round" />
      <line x1="100" y1="100" x2={sp.x} y2={sp.y} stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="100" cy="100" r="5" fill="var(--accent)" />
      <circle cx="100" cy="100" r="2" fill="var(--bg)" />
    </svg>
  );
}

export default function DayHeader({ day, isToday, now, jdn, size = 132 }) {
  const p = parts(now.minutes);

  return (
    <header className="dh">
      <Face minutes={isToday ? now.minutes : 6 * 60} seconds={isToday ? now.seconds : 0} size={size} />

      <div className="dh-text">
        <div className="dh-line">
          <h1 className="dh-title">{isToday ? "Today" : DOW[day.dow]}</h1>
          {isToday ? (
            <span className="dh-digital">
              {p.h}:{String(p.m).padStart(2, "0")}
              <span className="dh-sec">:{String(now.seconds).padStart(2, "0")}</span>
              <Mark night={p.night} size={7} />
            </span>
          ) : (
            <span className="dh-digital quiet">
              {jdn < now.jdn ? "past" : "ahead"} {Math.abs(jdn - now.jdn)}d
            </span>
          )}
        </div>

        <div className="dh-date am">
          {EC_M_AM[day.ec.m - 1]} {day.ec.d}, {day.ec.y}
        </div>
        <div className="dh-date">
          {DOW[day.dow]} {day.gc.d} {GC_MONTHS[day.gc.m - 1]} {day.gc.y}
        </div>
        {day.holidays.length ? <div className="dh-hol">{day.holidays.join(" · ")}</div> : null}
      </div>
    </header>
  );
}
