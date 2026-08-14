/**
 * The clock, both ways at once — a large analog face and the digital reading.
 *
 * It shows the ETHIOPIAN clock: the day starts at dawn, so 06:00 by the
 * international clock is 12 here. The face is a normal twelve-hour dial with
 * 12 at the top; the hands are simply offset six hours, which is exactly what
 * the reading means.
 *
 * Day and night are told apart by the mark, not by letters.
 */

import Mark from "./Mark.jsx";
import { parts } from "./format.js";

const hand = (angleDeg, len, c = 50) => {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: c + Math.cos(a) * len, y: c + Math.sin(a) * len };
};

export default function Clock({ minutes, seconds = 0, size = 72 }) {
  const p = parts(minutes);
  const m = minutes % 60;

  // Hour hand runs on the Ethiopian hour, so it points where the dial reads.
  const ethHour = (p.h % 12) + m / 60;
  const hp = hand(ethHour * 30, 25);
  const mp = hand((m + seconds / 60) * 6, 36);
  const sp = hand(seconds * 6, 39);

  return (
    <div className="clock">
      <svg
        className="clock-face"
        width={size}
        height={size}
        viewBox="0 0 100 100"
        aria-label={`${p.h}:${String(p.m).padStart(2, "0")} ${p.night ? "night" : "day"}`}
      >
        <circle cx="50" cy="50" r="47" fill="var(--surface-2)" stroke="var(--line)" strokeWidth="1" />

        {Array.from({ length: 12 }, (_, i) => {
          const major = i % 3 === 0;
          const a = hand(i * 30, 43);
          const b = hand(i * 30, major ? 35 : 39);
          return (
            <line
              key={i}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={major ? "var(--ink-3)" : "var(--line-strong)"}
              strokeWidth={major ? 2.4 : 1.4}
              strokeLinecap="round"
            />
          );
        })}

        {/* 12 sits at the top — dawn, the hour the day turns over */}
        <text x="50" y="24" textAnchor="middle" fill="var(--ink-3)"
          fontSize="11" fontWeight="500" fontFamily="var(--sans)">12</text>

        <line x1="50" y1="50" x2={hp.x} y2={hp.y} stroke="var(--ink)" strokeWidth="4.2" strokeLinecap="round" />
        <line x1="50" y1="50" x2={mp.x} y2={mp.y} stroke="var(--ink)" strokeWidth="2.8" strokeLinecap="round" />
        <line x1="50" y1="50" x2={sp.x} y2={sp.y} stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="50" cy="50" r="3.4" fill="var(--accent)" />
      </svg>

      <div className="clock-digits">
        <div className="clock-time">
          {p.h}:{String(p.m).padStart(2, "0")}
          <span className="sec">:{String(seconds).padStart(2, "0")}</span>
          <Mark night={p.night} size={9} style={{ marginLeft: 7 }} />
        </div>
      </div>
    </div>
  );
}
