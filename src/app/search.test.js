// @vitest-environment jsdom
/**
 * The search must detect what the user meant without being told the format.
 */

import { describe, it, expect } from "vitest";
import { search, suggestions } from "./search.js";
import { dayFromGc, dayFromJdn, DOW } from "../calendar.mjs";

// Fri 14 Aug 2026 GC = Nehase 8, 2018 EC
const NOW = { jdn: dayFromGc(2026, 8, 14).jdn };
const kinds = (hits) => hits.map((h) => h.kind);
const days = (hits) => hits.filter((h) => h.kind === "Day");

describe("weekday names", () => {
  it("finds the next Saturday from a bare word", () => {
    const hit = days(search("saturday", NOW))[0];
    expect(dayFromJdn(hit.jdn).dowName).toBe("Saturday");
    expect(hit.jdn).toBeGreaterThan(NOW.jdn);
  });

  it("matches on a prefix", () => {
    expect(days(search("sat", NOW))[0].jdn).toBe(days(search("saturday", NOW))[0].jdn);
    expect(days(search("we", NOW)).length).toBeGreaterThan(0);
  });

  it("understands Amharic weekday names", () => {
    const hit = days(search("ቅዳሜ", NOW))[0];
    expect(dayFromJdn(hit.jdn).dowName).toBe("Saturday");
  });

  it("always goes forward, never to today", () => {
    for (const d of DOW) {
      const hit = days(search(d.toLowerCase(), NOW))[0];
      expect(hit.jdn).toBeGreaterThan(NOW.jdn);
      expect(hit.jdn - NOW.jdn).toBeLessThanOrEqual(7);
    }
  });
});

describe("relative words", () => {
  it("resolves today, tomorrow and yesterday", () => {
    expect(days(search("today", NOW))[0].jdn).toBe(NOW.jdn);
    expect(days(search("tomorrow", NOW))[0].jdn).toBe(NOW.jdn + 1);
    expect(days(search("yesterday", NOW))[0].jdn).toBe(NOW.jdn - 1);
  });

  it("matches partial words", () => {
    expect(days(search("tom", NOW))[0].jdn).toBe(NOW.jdn + 1);
  });
});

describe("bare numbers offer both calendars", () => {
  it("reads 17 as day 17 in each calendar", () => {
    const hits = days(search("17", NOW));
    expect(hits).toHaveLength(2);
    const ec = dayFromJdn(hits[0].jdn).ec;
    const gc = dayFromJdn(hits[1].jdn).gc;
    expect(ec.d).toBe(17); // Nehase 17
    expect(gc.d).toBe(17); // 17 August
    // Neither is presented as the primary one.
    expect(hits[0].why).toMatch(/Nehase/);
    expect(hits[1].why).toMatch(/August/);
  });

  it("rejects a day that does not exist in a month", () => {
    // Nehase has 30 days, August has 31 — so 31 is Gregorian only.
    const hits = days(search("31", NOW));
    expect(hits).toHaveLength(1);
    expect(dayFromJdn(hits[0].jdn).gc.d).toBe(31);
  });

  it("ignores an impossible number", () => {
    expect(days(search("47", NOW))).toHaveLength(0);
  });
});

describe("dates in any shape", () => {
  it("reads day/month both ways", () => {
    const hits = days(search("8/12", NOW));
    expect(hits.length).toBe(2);
    expect(dayFromJdn(hits[0].jdn).ec).toMatchObject({ m: 12, d: 8 });
    expect(dayFromJdn(hits[1].jdn).gc).toMatchObject({ m: 12, d: 8 });
  });

  it("accepts dots, dashes and spaces as separators", () => {
    for (const sep of ["/", "-", ".", " "]) {
      expect(days(search(`8${sep}12`, NOW)).length).toBe(2);
    }
  });

  it("reads a full Ethiopian date", () => {
    const hit = days(search("2018-12-08", NOW)).find((h) => dayFromJdn(h.jdn).ec.y === 2018);
    expect(dayFromJdn(hit.jdn).ec).toMatchObject({ y: 2018, m: 12, d: 8 });
    expect(dayFromJdn(hit.jdn).gc).toMatchObject({ y: 2026, m: 8, d: 14 });
  });

  it("reads a full Gregorian date", () => {
    const hit = days(search("2026-08-14", NOW)).find((h) => dayFromJdn(h.jdn).gc.y === 2026);
    expect(hit.jdn).toBe(NOW.jdn);
  });
});

describe("month names", () => {
  it("finds an Ethiopian month", () => {
    const hit = search("meskerem", NOW).find((h) => h.kind === "Month");
    expect(hit.href).toMatch(/^#\/calendar\/\d+-1$/);
  });

  it("finds it in Amharic too", () => {
    expect(search("መስከረም", NOW).some((h) => h.kind === "Month")).toBe(true);
  });

  it("finds a Gregorian month", () => {
    expect(days(search("december", NOW)).length).toBeGreaterThan(0);
  });
});

describe("tasks, patterns and categories", () => {
  const ctx = {
    tasks: [
      { id: "default:lunch", title: "Lunch", titleAm: "ምሳ", rule: { kind: "everyday" }, startMin: 750, duration: 45 },
      { id: "t1", title: "Study", rule: { kind: "weekday" }, startMin: 900, duration: 60 },
    ],
    categories: [{ id: "c1", name: "School", color: "blue" }],
  };

  it("finds a task by name", () => {
    const hit = search("lunch", NOW, ctx).find((h) => h.kind === "Task");
    expect(hit.href).toMatch(/^#\/task\/default:lunch\//);
  });

  it("finds a task by its Amharic name", () => {
    expect(search("ምሳ", NOW, ctx).some((h) => h.kind === "Task")).toBe(true);
  });

  it("finds a pattern", () => {
    const hit = search("week", NOW, ctx).find((h) => h.kind === "Pattern");
    expect(hit.label).toBe("Weekdays");
  });

  it("finds a category", () => {
    expect(search("school", NOW, ctx).find((h) => h.kind === "Category").label).toBe("School");
  });

  it("mixes kinds in one result list without being asked", () => {
    const all = search("s", NOW, ctx);
    expect(new Set(kinds(all)).size).toBeGreaterThan(1);
  });
});

describe("housekeeping", () => {
  it("returns nothing for an empty query", () => {
    expect(search("", NOW)).toEqual([]);
    expect(search("   ", NOW)).toEqual([]);
  });

  it("never repeats a destination", () => {
    const hits = search("t", NOW, { tasks: [], categories: [] });
    expect(new Set(hits.map((h) => h.href)).size).toBe(hits.length);
  });

  it("caps the list so it stays readable", () => {
    expect(search("a", NOW).length).toBeLessThanOrEqual(10);
  });

  it("suggests yesterday, today and tomorrow when empty", () => {
    const s = suggestions(NOW).map((h) => h.jdn);
    expect(s).toEqual([NOW.jdn, NOW.jdn + 1, NOW.jdn - 1]);
  });

  it("gives every hit a usable destination", () => {
    for (const q of ["saturday", "17", "8/12", "meskerem", "tomorrow"]) {
      for (const h of search(q, NOW)) expect(h.href).toMatch(/^#\//);
    }
  });
});
