/**
 * Dual calendar core — Ethiopian (EC) and Gregorian (GC).
 *
 * Everything is computed through the Julian Day Number (JDN) so the two systems
 * meet at a single integer. No JavaScript `Date` objects anywhere in here: Date
 * carries a timezone, and a timezone turns "what day is it" into a question with
 * more than one answer. A day is (year, month, day) plus a JDN. Nothing else.
 *
 * Ethiopian calendar: 12 months of 30 days, plus Pagume — a 13th month of 5 days,
 * or 6 in a leap year. Leap years are those where year % 4 === 3.
 */

export const EC_MONTHS = [
  "Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit",
  "Megabit", "Miyazia", "Ginbot", "Sene", "Hamle", "Nehase", "Pagume",
];

export const GC_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Ethiopic epoch offset: Meskerem 1, 1 EC === JDN 1724221. */
const EC_EPOCH = 1724220;

export const isEcLeapYear = (year) => ((year % 4) + 4) % 4 === 3;

/** Days in an Ethiopian month. Only Pagume varies. */
export const ecMonthLength = (year, month) =>
  month === 13 ? (isEcLeapYear(year) ? 6 : 5) : 30;

export const gcToJdn = (y, m, d) => {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  );
};

export const jdnToGc = (jdn) => {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d2 = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d2) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    y: 100 * b + d2 - 4800 + Math.floor(m / 10),
    m: m + 3 - 12 * Math.floor(m / 10),
    d: e - Math.floor((153 * m + 2) / 5) + 1,
  };
};

export const ecToJdn = (y, m, d) =>
  EC_EPOCH + 365 * (y - 1) + Math.floor(y / 4) + 30 * (m - 1) + d;

export const jdnToEc = (jdn) => {
  // Estimate the year, then correct. Two comparisons make this exact rather
  // than relying on an algebraic inversion that is easy to get subtly wrong.
  let y = Math.floor((jdn - EC_EPOCH - 1) / 365.25) + 1;
  while (ecToJdn(y + 1, 1, 1) <= jdn) y++;
  while (ecToJdn(y, 1, 1) > jdn) y--;
  const dayOfYear = jdn - ecToJdn(y, 1, 1); // 0-based
  return {
    y,
    m: Math.floor(dayOfYear / 30) + 1,
    d: (dayOfYear % 30) + 1,
  };
};

// ── Holidays ────────────────────────────────────────────────────────────────

/**
 * Fixed-date holidays only.
 *
 * Movable feasts are deliberately absent — Fasika (Ethiopian Easter) follows a
 * computus, and Eid al-Fitr, Eid al-Adha and Mawlid follow the Hijri lunar
 * calendar with local moon-sighting. Approximating them would produce a planner
 * that is confidently wrong on the days that matter most. `extraHolidays`
 * accepts a lookup table so real dates can be supplied per year.
 */
export const EC_FIXED_HOLIDAYS = [
  { m: 1, d: 1, name: "Enkutatash (New Year)" },
  { m: 1, d: 17, name: "Meskel" },
  { m: 4, d: 29, name: "Genna (Christmas)" },
  { m: 5, d: 11, name: "Timkat (Epiphany)" },
  { m: 6, d: 23, name: "Adwa Victory Day" },
  { m: 8, d: 23, name: "Labour Day" },
  { m: 8, d: 27, name: "Patriots' Victory Day" },
];

export const GC_FIXED_HOLIDAYS = [
  { m: 1, d: 1, name: "New Year's Day" },
  { m: 12, d: 25, name: "Christmas Day" },
];

/** ISO date string, timezone-free. */
export const iso = ({ y, m, d }) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/**
 * The one rich day object every other module reads. Carries both calendars, so
 * no consumer ever has to convert — and so a View can show both at once.
 */
export const dayFromJdn = (jdn, extraHolidays = {}) => {
  const gc = jdnToGc(jdn);
  const ec = jdnToEc(jdn);
  const isoDate = iso(gc);
  const holidays = [
    ...EC_FIXED_HOLIDAYS.filter((h) => h.m === ec.m && h.d === ec.d).map((h) => h.name),
    ...GC_FIXED_HOLIDAYS.filter((h) => h.m === gc.m && h.d === gc.d).map((h) => h.name),
    ...(extraHolidays[isoDate] ?? []),
  ];
  // JDN 0 was a Monday; (jdn + 1) % 7 gives 0=Sunday.
  const dow = (jdn + 1) % 7;
  return {
    jdn,
    iso: isoDate,
    gc,
    ec,
    ecMonthName: EC_MONTHS[ec.m - 1],
    gcMonthName: GC_MONTHS[gc.m - 1],
    dow,
    dowName: DOW[dow],
    isWeekend: dow === 0 || dow === 6,
    holidays,
  };
};

export const dayFromGc = (y, m, d, extra) => dayFromJdn(gcToJdn(y, m, d), extra);
export const dayFromEc = (y, m, d, extra) => dayFromJdn(ecToJdn(y, m, d), extra);
export const dayFromIso = (isoStr, extra) => {
  const [y, m, d] = isoStr.split("-").map(Number);
  return dayFromGc(y, m, d, extra);
};

/** All days of an Ethiopian month — the grid the EC-first calendar renders. */
export const ecMonthDays = (y, m, extra) =>
  Array.from({ length: ecMonthLength(y, m) }, (_, i) => dayFromEc(y, m, i + 1, extra));

/** All days of a Gregorian month. */
export const gcMonthDays = (y, m, extra) => {
  const len = new Array(12).fill(0).map((_, i) => [31, isGcLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][i])[m - 1];
  return Array.from({ length: len }, (_, i) => dayFromGc(y, m, i + 1, extra));
};

export const isGcLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

export const addDays = (day, n, extra) => dayFromJdn(day.jdn + n, extra);
