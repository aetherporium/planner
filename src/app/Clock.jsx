/**
 * The clock, shown both ways at once: an analog face and digital readout.
 * It is part of the day header, not a pill floating over the screen.
 */

const hand = (angleDeg, len, cx = 20, cy = 20) => {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + Math.cos(a) * len, y: cy + Math.sin(a) * len };
};

export default function Clock({ minutes, seconds = 0, label }) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  const hourAngle = ((h % 12) + m / 60) * 30;
  const minuteAngle = (m + seconds / 60) * 6;
  const secondAngle = seconds * 6;

  const hp = hand(hourAngle, 8.5);
  const mp = hand(minuteAngle, 12.5);
  const sp = hand(secondAngle, 13.5);

  const ticks = Array.from({ length: 12 }, (_, i) => {
    const outer = hand(i * 30, 16.5);
    const inner = hand(i * 30, i % 3 === 0 ? 13.5 : 15);
    return { ...outer, x2: inner.x, y2: inner.y, major: i % 3 === 0 };
  });

  return (
    <div className="clock">
      <svg className="clock-face" width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="18.2" fill="none" stroke="var(--line)" strokeWidth="1" />
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x}
            y1={t.y}
            x2={t.x2}
            y2={t.y2}
            stroke={t.major ? "var(--ink-3)" : "var(--line-strong)"}
            strokeWidth={t.major ? 1.3 : 0.9}
            strokeLinecap="round"
          />
        ))}
        <line
          x1="20" y1="20" x2={hp.x} y2={hp.y}
          stroke="var(--ink)" strokeWidth="2" strokeLinecap="round"
        />
        <line
          x1="20" y1="20" x2={mp.x} y2={mp.y}
          stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round"
        />
        <line
          x1="20" y1="20" x2={sp.x} y2={sp.y}
          stroke="var(--accent)" strokeWidth="0.9" strokeLinecap="round"
        />
        <circle cx="20" cy="20" r="1.6" fill="var(--accent)" />
      </svg>

      <div className="clock-digits">
        <div className="clock-time">
          {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}
          <span className="sec">:{String(seconds).padStart(2, "0")}</span>
        </div>
        {label ? <div className="clock-label">{label}</div> : null}
      </div>
    </div>
  );
}
