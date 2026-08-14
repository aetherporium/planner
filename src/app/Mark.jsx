/**
 * Day / night indicator — visual, never the letters am/pm.
 *
 * Hollow ring = daylight hours (12 day through 11 day).
 * Filled disc = night hours (12 night through 11 night).
 */

import { parts } from "./format.js";

export default function Mark({ night, size = 7, style }) {
  return (
    <span
      role="img"
      aria-label={night ? "night" : "day"}
      title={night ? "night" : "day"}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        border: "1.5px solid currentColor",
        background: night ? "currentColor" : "transparent",
        opacity: 0.75,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

/** A time and its mark, as one unit. */
export function Time({ min, size = 7, gap = 5, style }) {
  const p = parts(min);
  if (!p) return <span style={style}>—</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap, ...style }}>
      {p.h}:{String(p.m).padStart(2, "0")}
      <Mark night={p.night} size={size} />
    </span>
  );
}
