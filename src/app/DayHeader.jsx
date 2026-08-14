/**
 * The day header. No card, no border, no square — it sits on the page.
 *
 * The clock is a circle and nothing more: no bounding box around it. The
 * digital reading is set on an arc inside the lower-right of the dial, so it
 * lives in the clock rather than beside it, and the whole thing takes less
 * width than it did.
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

  const digits = `${p.h}:${String(p.m).padStart(2, "0")}`;

  return (
    <svg
      className="face"
      width={size}
      height={size}
      viewBox="0 0 200 200"
      aria-label={`${digits} ${p.night ? "night" : "day"}`}
    >
      {/* the arc the digits sit on, lower right */}
      <defs>
        <path id="arc-digits" d="M 128 168 A 78 78 0 0 0 176 118" fill="none" />
      </defs>

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

      {/* the digital reading, arced into the corner of the dial */}
      <text
        className="face-digits"
        fill="var(--ink-3)"
        fontSize="15"
        fontWeight="500"
        fontFamily="var(--sans)"
        letterSpacing="1.2"
      >
        <textPath href="#arc-digits" startOffset="50%" textAnchor="middle">
          {digits}
        </textPath>
      </text>

      <line x1="100" y1="100" x2={hp.x} y2={hp.y} stroke="var(--ink)" strokeWidth="5.6" strokeLinecap="round" />
      <line x1="100" y1="100" x2={mp.x} y2={mp.y} stroke="var(--ink)" strokeWidth="3.4" strokeLinecap="round" />
      {/* only the second hand moves continuously — it is the only unit that does */}
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
      <Face
        minutes={isToday ? now.minutes : 6 * 60}
        seconds={isToday ? now.seconds : 0}
        size={size}
        live={isToday}
      />

      <div className="dh-text">
        <div className="dh-line">
          <h1 className="dh-title">{isToday ? "Today" : DOW[day.dow]}</h1>
          {isToday ? (
            <Mark night={p.night} size={8} style={{ color: "var(--ink-3)" }} />
          ) : (
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
