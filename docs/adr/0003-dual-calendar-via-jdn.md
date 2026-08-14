# ADR-0003 — Both calendars, joined at the Julian Day Number

**Status:** Accepted

## Context

The planner must show the Ethiopian and Gregorian calendars together, and let a
blueprint rule fire on "day 1 of the month" in *either* system.

## Decision

Every date conversion goes through the **Julian Day Number**. A day is
`(jdn, gc{y,m,d}, ec{y,m,d}, dow, holidays)` — computed once, read everywhere.

**No JavaScript `Date` anywhere in the domain.** `Date` carries a timezone, and a
timezone makes "what day is it" a question with more than one answer. A planner
that disagrees with itself about today's date at 23:30 is broken.

Ethiopian rules encoded: 12 × 30-day months plus Pagume (5 days, 6 in leap years);
leap when `year % 4 === 3`; epoch fixed so Meskerem 1, 1 EC = JDN 1724221.

Verified against known anchors: Enkutatash 2018 EC = 2025-09-11, the post-leap
shift to 2023-09-12 for 2016 EC, Genna = 7 January, and a JDN round-trip across
~1000 sampled days in both directions.

## Consequences

- `ec-monthday` and `gc-monthday` are both first-class blueprint rules.
- One grid renders either calendar as primary with the other inset, because both
  are always present on the day object.
- **Movable feasts are deliberately excluded.** Fasika follows a computus and the
  Islamic holidays follow the Hijri calendar with local moon-sighting. An
  approximation would be confidently wrong on exactly the days that matter most,
  so `extraHolidays` takes a supplied per-year table instead.
