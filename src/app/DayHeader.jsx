/**
 * The day header. No card, no border — it sits on the page.
 *
 * The dial is a circle and nothing more. The digital reading sits OUTSIDE it,
 * upright, above the dial's top-left corner: numbers bent around an arc look
 * decorative but are hard to actually read, so they get their own upright spot.
 */

import Mark from "./Mark.jsx";
import { parts } from "./format.js";
import { DOW, GC_MONTHS } from "../calendar.mjs";

const EC_M_AM = [
  "መስከረም", "ጥቅምት", "ኅዳር", "ታኅሣሥ", "ጥር", "የካቲት",
  "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ",
];

const at = (deg, len, c = 100) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: c + Math.cos(a) * len, y: c + Math.sin(a) * len };
};

function Face({ minutes, seconds, size, live }) {
  const p = parts(minutes);
  const m = minutes % 60;

  const hp = at((p.h % 12) * 30 + (m / 60) * 30, 50);
  const mp = at((m + seconds / 60) * 6, 72);
  const sp = at(seconds * 6, 78);

  return (
    <svg
      className="face"
      width={size}
      height={size}
      viewBox="0 0 200 200"
      aria-label={`${p.h}:${String(p.m).padStart(2, "0")} ${p.night ? "night" : "day"}`}
    >
      <circle cx="100" cy="100" r="95" fill="none" stroke="var(--line)" strokeWidth="1" />

      {Array.from({ length: 60 }, (_, i) => {
        if (i % 5 === 0) return null;
        const a = at(i * 6, 91);
        const b = at(i * 6, 87);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--line-strong)" strokeWidth="1" />;
      })}

      {Array.from({ length: 12 }, (_, i) => {
        const n = i === 0 ? 12 : i;
        const pos = at(i * 30, 73);
        const major = i % 3 === 0;
        return (
          <text
            key={n}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={major ? "var(--ink-2)" : "var(--ink-3)"}
            fontSize={major ? 19 : 15.5}
            fontWeight={major ? 600 : 400}
            fontFamily="var(--sans)"
          >
            {n}
          </text>
        );
      })}

      <line x1="100" y1="100" x2={hp.x} y2={hp.y} stroke="var(--ink)" strokeWidth="5.6" strokeLinecap="round" />
      <line x1="100" y1="100" x2={mp.x} y2={mp.y} stroke="var(--ink)" strokeWidth="3.4" strokeLinecap="round" />
      {/* the only continuous motion in the app — seconds are the only unit
          shown at that resolution */}
      {live ? (
        <line x1="100" y1="100" x2={sp.x} y2={sp.y} stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      ) : null}
      <circle cx="100" cy="100" r="4.6" fill="var(--accent)" />
      <circle cx="100" cy="100" r="1.8" fill="var(--bg)" />
    </svg>
  );
}

export default function DayHeader({ day, isToday, now, jdn, size = 116 }) {
  const p = parts(now.minutes);

  return (
    <header className="dh">
      <div className="dh-clock">
        {isToday ? (
          <span className="dh-read">
            {p.h}:{String(p.m).padStart(2, "0")}
            <span className="dh-sec">:{String(now.seconds).padStart(2, "0")}</span>
            <Mark night={p.night} size={7} />
          </span>
        ) : null}
        <Face
          minutes={isToday ? now.minutes : 6 * 60}
          seconds={isToday ? now.seconds : 0}
          size={size}
          live={isToday}
        />
      </div>

      <div className="dh-text">
        <div className="dh-line">
          <h1 className="dh-title">{isToday ? "Today" : DOW[day.dow]}</h1>
          {isToday ? null : (
            <span className="dh-rel">
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
