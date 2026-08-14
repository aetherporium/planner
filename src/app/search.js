/**
 * "Go anywhere" — one field, no modes.
 *
 * The user types whatever they mean and the kind is detected, never chosen:
 *
 *   saturday       a weekday name, in English or Amharic → the next Saturday
 *   tomorrow       a relative word
 *   17             a bare number → day 17 of the month showing, both calendars
 *   8/12           a day and month
 *   2018-12-08     a full Ethiopian or Gregorian date
 *   lunch          a task
 *   daily          a pattern
 *   school         a category
 *
 * Everything that parses is offered at once, so an ambiguous "8" shows both
 * Nehase 8 and 8 August rather than guessing.
 */

import {
  dayFromJdn,
  dayFromEc,
  dayFromGc,
  ecToJdn,
  gcToJdn,
  ecMonthLength,
  DOW,
  EC_MONTHS,
  GC_MONTHS,
  isGcLeap,
} from "../calendar.mjs";
import { patternsIn } from "../patterns.mjs";

const DOW_AM = ["እሑድ", "ሰኞ", "ማክሰኞ", "ረቡዕ", "ሐሙስ", "ዓርብ", "ቅዳሜ"];
const EC_M_AM = [
  "መስከረም", "ጥቅምት", "ኅዳር", "ታኅሣሥ", "ጥር", "የካቲት",
  "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ",
];

const RELATIVE = {
  today: 0, now: 0,
  tomorrow: 1, tmrw: 1,
  yesterday: -1,
  "next week": 7, "last week": -7,
};

const gcMonthLength = (y, m) =>
  [31, isGcLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];

const dayHit = (jdn, why) => {
  const d = dayFromJdn(jdn);
  return {
    kind: "Day",
    label: `${DOW[d.dow]} ${d.gc.d} ${GC_MONTHS[d.gc.m - 1]} ${d.gc.y}`,
    sub: `${EC_M_AM[d.ec.m - 1]} ${d.ec.d}`,
    am: true,
    why,
    href: `#/day/${jdn}`,
    jdn,
  };
};

/**
 * @param q      what the user typed
 * @param now    {jdn}
 * @param ctx    { tasks, categories }
 */
export const search = (q, now, ctx = {}) => {
  const raw = String(q ?? "").trim();
  if (!raw) return [];
  const s = raw.toLowerCase();
  const out = [];
  const today = dayFromJdn(now.jdn);

  // ── relative words ──────────────────────────────────────────────────────
  for (const [word, delta] of Object.entries(RELATIVE)) {
    if (word.startsWith(s)) out.push(dayHit(now.jdn + delta, word));
  }

  // ── weekday names, English or Amharic → the next one ────────────────────
  for (let i = 0; i < 7; i++) {
    const en = DOW[i].toLowerCase();
    if ((s.length >= 2 && en.startsWith(s)) || DOW_AM[i].startsWith(raw)) {
      const ahead = (i - today.dow + 7) % 7 || 7;
      out.push(dayHit(now.jdn + ahead, `next ${DOW[i]}`));
    }
  }

  // ── month names → the 1st of that month ─────────────────────────────────
  for (let i = 0; i < 13; i++) {
    const en = EC_MONTHS[i].toLowerCase();
    if ((s.length >= 2 && en.startsWith(s)) || EC_M_AM[i].startsWith(raw)) {
      const y = i + 1 >= today.ec.m ? today.ec.y : today.ec.y + 1;
      out.push({
        kind: "Month",
        label: `${EC_MONTHS[i]} ${y}`,
        sub: EC_M_AM[i],
        am: true,
        href: `#/calendar/${y}-${i + 1}`,
      });
    }
  }
  for (let i = 0; i < 12; i++) {
    if (s.length >= 3 && GC_MONTHS[i].toLowerCase().startsWith(s)) {
      const y = i + 1 >= today.gc.m ? today.gc.y : today.gc.y + 1;
      out.push(dayHit(gcToJdn(y, i + 1, 1), `${GC_MONTHS[i]} 1`));
    }
  }

  // ── a bare number → that day of the month currently in view, both ways ──
  let m = /^(\d{1,2})$/.exec(s);
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= ecMonthLength(today.ec.y, today.ec.m)) {
      out.push(dayHit(ecToJdn(today.ec.y, today.ec.m, n), `${EC_MONTHS[today.ec.m - 1]} ${n}`));
    }
    if (n >= 1 && n <= gcMonthLength(today.gc.y, today.gc.m)) {
      out.push(dayHit(gcToJdn(today.gc.y, today.gc.m, n), `${GC_MONTHS[today.gc.m - 1]} ${n}`));
    }
  }

  // ── day/month → both calendars ──────────────────────────────────────────
  m = /^(\d{1,2})[\/\-. ](\d{1,2})$/.exec(s);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (b >= 1 && b <= 13 && a >= 1 && a <= ecMonthLength(today.ec.y, b)) {
      out.push(dayHit(ecToJdn(today.ec.y, b, a), `${EC_MONTHS[b - 1]} ${a}`));
    }
    if (b >= 1 && b <= 12 && a >= 1 && a <= gcMonthLength(today.gc.y, b)) {
      out.push(dayHit(gcToJdn(today.gc.y, b, a), `${a} ${GC_MONTHS[b - 1]}`));
    }
  }

  // ── full date: year-month-day, whichever calendar the year implies ──────
  m = /^(\d{4})[\/\-. ](\d{1,2})[\/\-. ](\d{1,2})$/.exec(s);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (mo >= 1 && mo <= 13 && d >= 1 && d <= ecMonthLength(y, mo)) {
      out.push(dayHit(dayFromEc(y, mo, d).jdn, "Ethiopian"));
    }
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= gcMonthLength(y, mo)) {
      out.push(dayHit(dayFromGc(y, mo, d).jdn, "Gregorian"));
    }
  }

  // ── tasks, patterns, categories ─────────────────────────────────────────
  for (const t of ctx.tasks ?? []) {
    if (t.title.toLowerCase().includes(s) || (t.titleAm ?? "").includes(raw)) {
      out.push({
        kind: "Task",
        label: t.title,
        sub: t.titleAm ?? "",
        am: Boolean(t.titleAm),
        href: `#/task/${t.id}/${now.jdn}`,
      });
    }
  }

  for (const p of patternsIn((ctx.tasks ?? []).filter((t) => t.rule))) {
    if (p.name.toLowerCase().includes(s)) {
      out.push({ kind: "Pattern", label: p.name, sub: p.cadence, href: `#/blueprints/${p.id}` });
    }
  }

  for (const c of ctx.categories ?? []) {
    if (c.name.toLowerCase().includes(s)) {
      out.push({ kind: "Category", label: c.name, sub: "", href: "#/blueprints" });
    }
  }

  // de-duplicate by destination, keep first reason
  const seen = new Set();
  return out.filter((h) => !seen.has(h.href) && seen.add(h.href)).slice(0, 10);
};

/** With an empty field: where you are likely to want to go. */
export const suggestions = (now) => [
  dayHit(now.jdn, "today"),
  dayHit(now.jdn + 1, "tomorrow"),
  dayHit(now.jdn - 1, "yesterday"),
];
