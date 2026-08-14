/**
 * The Ethiopian clock.
 *
 * The day begins at dawn, not at midnight. 6:00 by the international clock is
 * 12 o'clock here — hour zero — and the count runs 12, 1, 2 … 11 through
 * daylight, then 12, 1, 2 … 11 again through the night.
 *
 *   06:00 GC → 12 day      12:30 GC → 6:30 day
 *   07:00 GC →  1 day      19:30 GC → 1:30 night
 *   18:00 GC → 12 night    22:30 GC → 4:30 night
 *   00:00 GC →  6 night
 *
 * Storage never changes: the domain layer keeps minutes from midnight and
 * `fmtTime` still returns 24-hour. This module is only how a time is read.
 *
 * DAWN is also where the timeline starts, which is why a 22:30 sleep of 450
 * minutes lands exactly on the end of the day instead of falling off it.
 */

export const DAWN = 6 * 60; // 06:00 GC — the hour the day turns over

/** Minutes from midnight → minutes from dawn (0…1439). */
export const fromDawn = (min) => (((min - DAWN) % 1440) + 1440) % 1440;

/** Minutes from dawn → minutes from midnight. */
export const toClock = (fromDawnMin) => (((fromDawnMin + DAWN) % 1440) + 1440) % 1440;

export const parts = (min) => {
  if (min == null) return null;
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const e = ((h24 - 6) % 12 + 12) % 12;
  return {
    h: e === 0 ? 12 : e,
    m: m % 60,
    // Daylight runs 06:00–17:59; night runs 18:00–05:59.
    night: h24 >= 18 || h24 < 6,
  };
};

/** "6:30" — never with a period word. Pair it with <Mark/>. */
export const t12 = (min) => {
  const p = parts(min);
  if (!p) return "—";
  return `${p.h}:${String(p.m).padStart(2, "0")}`;
};

export const isNight = (min) => (min == null ? false : parts(min).night);

/**
 * Parse "6:30" typed on the Ethiopian clock back into minutes from midnight.
 * `night` picks which half of the day is meant.
 */
export const parseEth = (str, night) => {
  const match = /^(\d{1,2})(?::(\d{2}))?$/.exec(String(str).trim());
  if (!match) return null;
  let h = Number(match[1]);
  const mi = Number(match[2] ?? 0);
  if (h < 1 || h > 12 || mi > 59) return null;
  if (h === 12) h = 0;
  // hour 0 of daylight is 06:00; hour 0 of night is 18:00
  return (((night ? h + 18 : h + 6) % 24) * 60 + mi);
};

/** Hour label for the timeline ruler, given minutes from dawn. */
export const rulerHour = (fromDawnMin) => {
  const h = Math.floor(fromDawnMin / 60) % 12;
  return h === 0 ? 12 : h;
};
