/**
 * The morning/afternoon indicator — visual, not the letters "am"/"pm".
 *
 * Hollow ring  = before noon (the sun has not come over the top).
 * Filled disc  = noon onwards.
 *
 * It reads as a small punctuation mark beside a time and needs no legend once
 * you have seen a day go past.
 */

export default function Mark({ pm, size = 7, style }) {
  return (
    <span
      role="img"
      aria-label={pm ? "afternoon" : "morning"}
      title={pm ? "afternoon" : "morning"}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        border: "1.5px solid currentColor",
        background: pm ? "currentColor" : "transparent",
        opacity: 0.75,
        flexShrink: 0,
        verticalAlign: "baseline",
        ...style,
      }}
    />
  );
}

/** A time and its mark, as one unit. */
export function Time({ min, size = 7, gap = 5, style }) {
  if (min == null) return <span style={style}>—</span>;
  const h24 = Math.floor((((min % 1440) + 1440) % 1440) / 60);
  const m = (((min % 1440) + 1440) % 1440) % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap, ...style }}>
      {h}:{String(m).padStart(2, "0")}
      <Mark pm={h24 >= 12} size={size} />
    </span>
  );
}
