/**
 * The clock, both ways at once — a large analog face with the digital reading
 * beside it. Twelve-hour, because the day starts at 12 in the morning.
 *
 * Morning and afternoon are told apart by the mark, not by letters.
 */

import Mark from "./Mark.jsx";

const hand = (angleDeg, len, c = 50) => {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: c + Math.cos(a) * len, y: c + Math.sin(a) * len };
};

export default function Clock({ minutes, seconds = 0, size = 72 }) {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  const pm = h24 >= 12;

  const hp = hand(((h24 % 12) + m / 60) * 30, 25);
  const mp = hand((m + seconds / 60) * 6, 36);
  const sp = hand(seconds * 6, 39);

  return (
    <div className="clock">
      <svg
        className="clock-face"
        width={size}
        height={size}
        viewBox="0 0 100 100"
        aria-label={`${h}:${String(m).padStart(2, "0")} ${pm ? "afternoon" : "morning"}`}
      >
        <circle cx="50" cy="50" r="47" fill="var(--surface-2)" stroke="var(--line)" strokeWidth="1" />

        {/* 12 hour ticks; the quarters are longer */}
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

        {/* 12 sits at the top — the hour the day begins on */}
        <text
          x="50" y="24"
          textAnchor="middle"
          fill="var(--ink-3)"
          fontSize="11"
          fontWeight="500"
          fontFamily="var(--sans)"
        >
          12
        </text>

        <line x1="50" y1="50" x2={hp.x} y2={hp.y} stroke="var(--ink)" strokeWidth="4.2" strokeLinecap="round" />
        <line x1="50" y1="50" x2={mp.x} y2={mp.y} stroke="var(--ink)" strokeWidth="2.8" strokeLinecap="round" />
        <line x1="50" y1="50" x2={sp.x} y2={sp.y} stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="50" cy="50" r="3.4" fill="var(--accent)" />
      </svg>

      <div className="clock-digits">
        <div className="clock-time">
          {h}:{String(m).padStart(2, "0")}
          <span className="sec">:{String(seconds).padStart(2, "0")}</span>
          <Mark pm={pm} size={9} style={{ marginLeft: 7 }} />
        </div>
      </div>
    </div>
  );
}
