/**
 * Display formatting.
 *
 * The day starts at 12 in the morning and is shown in 12-hour form: 12, 1, 2 …
 * 11, then 12, 1 … 11 again. Morning and afternoon are told apart by a MARK,
 * not by the letters "am"/"pm" — a hollow ring before noon, a filled dot after.
 *
 * The domain layer keeps minutes-from-midnight and 24-hour `fmtTime`; this is
 * purely how it is read on screen.
 */

export const parts12 = (min) => {
  if (min == null) return null;
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  return {
    h: h24 % 12 === 0 ? 12 : h24 % 12,
    m: m % 60,
    pm: h24 >= 12,
  };
};

/** "7:30" — never with a meridiem word. Pair it with <Mark/>. */
export const t12 = (min) => {
  const p = parts12(min);
  if (!p) return "—";
  return `${p.h}:${String(p.m).padStart(2, "0")}`;
};

/** Just the hour, for the timeline ruler. */
export const h12 = (hour24) => (hour24 % 12 === 0 ? 12 : hour24 % 12);

export const isPm = (min) => (min == null ? false : parts12(min).pm);
