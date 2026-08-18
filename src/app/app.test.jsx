// @vitest-environment jsdom
/**
 * Smoke tests: every route renders, and the product rules the brief insists on
 * are actually enforced in the UI, not just in the pure modules.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, within, fireEvent, act } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { PROTOTYPES } from "./prototypes.js";

const CSS = readFileSync("src/app/styles.css", "utf8");
import App from "./App.jsx";
import { parseHash } from "./hooks.js";
import { readNow, ruleIdOf, ruleById } from "./store.js";
import { t12, parts, fromDawn, parseEth, DAWN } from "./format.js";
import { dayFromJdn, ecMonthDays } from "../calendar.mjs";
import { DEFAULT_TASKS } from "../defaults.mjs";

const at = (hash) => {
  window.location.hash = hash;
  return render(<App />);
};

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "";
});
afterEach(cleanup);

describe("router", () => {
  it("maps every route", () => {
    expect(parseHash("#/")).toEqual({ name: "today" });
    expect(parseHash("")).toEqual({ name: "today" });
    expect(parseHash("#/calendar")).toEqual({ name: "calendar" });
    expect(parseHash("#/calendar/2018-12")).toEqual({ name: "calendar", ecY: 2018, ecM: 12 });
    expect(parseHash("#/day/2461267")).toEqual({ name: "day", jdn: 2461267 });
    expect(parseHash("#/day/2461267/add")).toEqual({ name: "add", jdn: 2461267 });
    expect(parseHash("#/blueprints")).toEqual({ name: "blueprints", focus: null });
    expect(parseHash("#/task/default:wake/2461267")).toEqual({
      name: "task",
      id: "default:wake",
      jdn: 2461267,
    });
  });

  it("falls back to today on nonsense", () => {
    expect(parseHash("#/nope/nope")).toEqual({ name: "today" });
  });
});

describe("pages render", () => {
  it("today is the default landing page", () => {
    at("#/");
    // The day name is a control — it opens a calendar — so it is a button.
    expect(document.querySelector(".dh-title").textContent).toMatch(/Today/);
  });

  it("the day is the core page — no breadcrumb trail above it", () => {
    const { container } = at("#/");
    // Directory-style crumbs are gone. Today is the root, not a leaf.
    expect(container.querySelector(".crumbs")).toBeNull();
    expect(container.querySelector(".top-back")).toBeNull();
  });

  it("calendar renders both calendars in one grid", () => {
    const { container } = at("#/calendar");
    const cells = container.querySelectorAll("a.cell");
    expect(cells.length).toBeGreaterThan(27);
    const first = cells[0];
    expect(first.querySelector(".ec")).toBeTruthy(); // Ethiopian
    expect(first.querySelector(".gc")).toBeTruthy(); // Gregorian
  });

  it("blueprints is a task-adding page, not a directory", () => {
    const { container } = at("#/blueprints");
    // Primary affordance is adding a task.
    const add = container.querySelector('.bp-hero a[href$="/add"]');
    expect(add.textContent).toMatch(/New task/);
    // The description card is gone.
    expect(container.textContent).not.toMatch(/what you do unfailingly/i);
  });

  it("task detail shows all three kinds of time", () => {
    at("#/task/default:wake/" + readNow().jdn);
    expect(screen.getByText("Planned")).toBeTruthy();
    expect(screen.getByText("Actual")).toBeTruthy();
    expect(screen.getByText("Logged")).toBeTruthy();
  });

  it("add page requires a name, a date, a time and a frequency", () => {
    const { container } = at(`#/day/${readNow().jdn}/add`);
    expect(container.querySelector("#t")).toBeTruthy();
    expect(container.querySelector("#s")).toBeTruthy();
    expect(container.querySelector("#f")).toBeTruthy();
    expect(container.querySelector(".datepick")).toBeTruthy();
    // Four fields carry the required mark.
    expect(container.querySelectorAll(".req").length).toBeGreaterThanOrEqual(4);
    // Frequency starts unset, so it cannot be skipped by accident.
    expect(container.querySelector("#f").value).toBe("");
    const submit = container.querySelector('form button[type="submit"]');
    expect(submit.disabled).toBe(true);
    expect(container.textContent).toMatch(/Still needs .*how often it repeats/);
  });

  it("add page has a description, and keeps only extras behind a disclosure", () => {
    const { container } = at(`#/day/${readNow().jdn}/add`);
    expect(container.querySelector("#ds")).toBeTruthy();
    const details = container.querySelector("details.disclosure");
    expect(details.open).toBe(false);
    // Only place and category are optional enough to hide.
    expect(within(details).getByLabelText("Place")).toBeTruthy();
    expect(within(details).queryByLabelText("How often")).toBeNull();
  });

  it("becomes submittable once the requirements are met", () => {
    const { container } = at(`#/day/${readNow().jdn}/add`);
    fireEvent.change(container.querySelector("#t"), { target: { value: "Read" } });
    fireEvent.change(container.querySelector("#f"), { target: { value: "daily" } });
    const submit = container.querySelector('form button[type="submit"]');
    expect(submit.disabled).toBe(false);
  });

  it("unknown task and blueprint ids degrade gracefully", () => {
    at("#/task/nope/999");
    expect(screen.getByText(/no longer exists/)).toBeTruthy();
  });
});

describe("product rules hold in the UI", () => {
  it("shows no fabricated data on a fresh install", () => {
    at("#/");
    // Only the five real defaults exist. No invented history, no logs.
    expect(JSON.parse(localStorage.getItem("planner:entries") ?? "[]")).toEqual([]);
    expect(screen.queryByText(/logged/)).toBeNull();
  });

  it("never punishes: no streak or failure language anywhere", () => {
    const bad = /streak|failed|failure|missed|behind|score|you didn't|penalt/i;
    for (const hash of ["#/", "#/calendar", "#/blueprints"]) {
      const { container } = at(hash);
      expect(container.textContent).not.toMatch(bad);
      cleanup();
    }
  });

  it("blocks marking a future task done", () => {
    const now = readNow();
    // Sleep is at 22:30; if the test runs before then the button must be off.
    const { container } = at(`#/task/default:sleep/${now.jdn}`);
    const yes = [...container.querySelectorAll("button")].find((b) =>
      /Yes, I did this/.test(b.textContent),
    );
    if (now.minutes < 22 * 60 + 30) {
      expect(yes.disabled).toBe(true);
      expect(container.textContent).toMatch(/can.t record something/i);
      // and it offers the alternative rather than a scolding
      expect(container.textContent).toMatch(/reschedule/i);
    } else {
      expect(yes.disabled).toBe(false);
    }
  });

  it("blocks any task on a future day", () => {
    const now = readNow();
    const { container } = at(`#/task/default:wake/${now.jdn + 3}`);
    const yes = [...container.querySelectorAll("button")].find((b) =>
      /Yes, I did this/.test(b.textContent),
    );
    expect(yes.disabled).toBe(true);
    expect(container.textContent).toMatch(/hasn.t happened yet/i);
  });

  it("defaults to blank and says so", () => {
    const { container } = at(`#/task/default:wake/${readNow().jdn}`);
    expect(container.textContent).toMatch(/blank, which means no information/i);
    // No status button is pre-selected.
    expect(container.querySelectorAll("button.on").length).toBe(0);
  });

  it("uses no emoji", () => {
    for (const hash of ["#/", "#/calendar", "#/blueprints"]) {
      const { container } = at(hash);
      expect(container.textContent).not.toMatch(
        /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u,
      );
      cleanup();
    }
  });

  it("has no top bar or sidebar — navigation is inside the content", () => {
    const { container } = at("#/");
    expect(container.querySelector("header.dh")).toBeTruthy();
    expect(container.querySelector("nav.topbar, aside, .sidebar, .tabs")).toBeNull();
  });

  it("navigates only with anchors, never with jump buttons", () => {
    for (const hash of ["#/", "#/calendar"]) {
      const { container } = at(hash);
      for (const b of container.querySelectorAll("button")) {
        expect(b.textContent).not.toMatch(/go to|open |view /i);
      }
      expect(container.querySelectorAll('a[href^="#/"]').length).toBeGreaterThan(2);
      cleanup();
    }
  });

  it("keeps Amharic to the calendar, English everywhere else", () => {
    const ethiopic = /[\u1200-\u137F]/;
    const { container } = at("#/blueprints");
    // The blueprints page is pure English.
    expect(container.querySelector(".page").textContent).not.toMatch(ethiopic);
    cleanup();

    const cal = at("#/calendar").container.querySelector(".page");
    // Every Ethiopic string in the calendar is inside an .am element.
    for (const node of cal.querySelectorAll("*")) {
      if (node.children.length === 0 && ethiopic.test(node.textContent)) {
        expect(node.closest(".am")).toBeTruthy();
      }
    }
  });

  it("renders the clock in analog and digital form at once", () => {
    const { container } = at("#/");
    expect(container.querySelector("svg.face")).toBeTruthy();
    expect(container.querySelector(".face-digits textPath").textContent).toMatch(/^\d{1,2}:\d{2}$/);
  });

  it("has no floating clock pill and no quick-add on the day", () => {
    const { container } = at("#/");
    expect(container.querySelector(".pill, .fab, .quickadd")).toBeNull();
    expect(container.querySelector("header.dh svg.face")).toBeTruthy();
  });

  it("has nothing at the bottom of the day and no add button on it", () => {
    const { container } = at("#/");
    expect(container.querySelector(".footlinks")).toBeNull();
    expect(container.textContent).not.toMatch(/add to this day/i);
  });

  it("puts the theme control on the top right, with no label", () => {
    const { container } = at("#/");
    const t = container.querySelector(".top-btn:last-child");
    expect(t).toBeTruthy();
    expect(t.textContent.trim()).toBe("");
    expect(t.querySelector("svg")).toBeTruthy();
  });

  it("carries the same theme control on every page", () => {
    for (const hash of ["#/", "#/calendar", "#/blueprints", `#/day/${readNow().jdn}/add`]) {
      const { container } = at(hash);
      expect(container.querySelector(".top-btn:last-child")).toBeTruthy();
      cleanup();
    }
  });

  it("shows no tag chips on the day", () => {
    const { container } = at("#/");
    expect(container.querySelector(".dayhead .chips")).toBeNull();
  });

  it("is a circle with numbers and no bounding box", () => {
    const { container } = at("#/");
    const head = container.querySelector("header.dh");
    // The clock leads the header.
    expect(head.firstElementChild.classList.contains("dh-clock")).toBe(true);
    const face = head.querySelector("svg.face");
    // Real numbers on the dial.
    const nums = [...face.querySelectorAll("text")]
      .filter((t) => !t.classList.contains("face-digits"))
      .map((t) => t.textContent);
    expect(nums).toHaveLength(12);
    expect(nums).toContain("12");
    // A circle, not a square: no rect, and the only outline is a circle.
    expect(face.querySelector("rect")).toBeNull();
    expect(face.querySelector("circle")).toBeTruthy();
    // No card around it either.
    expect(head.classList.contains("glass")).toBe(false);
  });

  it("arcs the digits inside the dial", () => {
    const { container } = at("#/");
    const arc = container.querySelector("svg.face .face-digits textPath");
    expect(arc).toBeTruthy();
    expect(arc.getAttribute("href")).toBe("#arc-digits");
    expect(arc.textContent).toMatch(/^\d{1,2}:\d{2}$/);
  });

  it("keeps the clock modest in size", () => {
    const { container } = at("#/");
    const w = Number(container.querySelector("svg.face").getAttribute("width"));
    expect(w).toBeGreaterThan(100);
    expect(w).toBeLessThanOrEqual(120);
  });

  it("shows the day/night mark in the header line", () => {
    const { container } = at("#/");
    const mark = container.querySelector('.dh-line [role="img"], .dh [role="img"]');
    expect(["day", "night"]).toContain(mark.getAttribute("aria-label"));
  });
});

describe("the 24-hour timeline", () => {
  const px = 1.15;

  it("covers a full 24 hours and lays out at full height in the page", () => {
    const { container } = at("#/");
    const cur = container.querySelector(".tl-day.current");
    expect(cur.style.height).toBe(`${1440 * px}px`);
    // Only the visible slice is drawn, so this is bounded rather than 25.
    expect(cur.querySelectorAll(".tl-hour").length).toBeGreaterThan(0);

    // The page is the scroller: the timeline fixes no height of its own and
    // opens no second scrollbar inside the page.
    const sc = container.querySelector(".tl-scroll");
    expect(sc.style.height).toBeFalsy();
    expect(CSS).not.toMatch(/\.tl-scroll \{[^}]*overflow-y: auto/);
    expect(container.querySelector(".tl-track").style.height).toBe(`${1440 * px}px`);
  });

  it("shows one day, and ends where the day ends", () => {
    const jdn = readNow().jdn;
    const { container } = at("#/");
    // You cannot drift into a neighbouring day by scrolling.
    expect(container.querySelectorAll(".tl-day")).toHaveLength(1);
    expect(container.querySelectorAll(".tl-day.current")).toHaveLength(1);
    expect(container.querySelectorAll(".tl-day.neighbour")).toHaveLength(0);

    // Crossing a day is deliberate: an affordance at each end.
    const divs = [...container.querySelectorAll("a.tl-div")].map((a) => a.getAttribute("href"));
    expect(divs).toContain(`#/day/${jdn + 1}`);
    expect(divs).toContain(`#/day/${jdn - 1}`);
  });

  it("points the next-day arrow downward", () => {
    const { container } = at("#/");
    const next = container.querySelector("a.tl-div-next");
    // It uses the arrowDown glyph, not a rotated up arrow.
    expect(next.querySelector("svg").getAttribute("style") ?? "").not.toMatch(/rotate/);
    const d = next.querySelector("svg path").getAttribute("d");
    expect(d).toBe("M10 4v12m0 0 5-5m-5 5-5-5");
  });

  it("gives every entry a height equal to its duration", () => {
    const { container } = at("#/");
    const byTitle = {};
    for (const ev of container.querySelectorAll("a.ev")) {
      byTitle[ev.querySelector(".ev-title").textContent] = ev;
    }
    // Breakfast 30m, Lunch 45m, Sleep 450m. Wake is a moment, not a block.
    const h = (t) => parseFloat(byTitle[t].style.height);
    const top = (t) => parseFloat(byTitle[t].style.top);

    expect(h("Breakfast")).toBeCloseTo(30 * px - 3, 1);
    expect(h("Lunch")).toBeCloseTo(45 * px - 3, 1);
    expect(h("Sleep")).toBeCloseTo(450 * px - 3, 1);
    // Lunch really is 1.5x breakfast on screen.
    expect(h("Lunch") / h("Breakfast")).toBeGreaterThan(1.4);
    expect(byTitle.Wake).toBeUndefined(); // a moment, drawn as a line

    // Position is measured from dawn, because the day begins at dawn.
    expect(top("Breakfast")).toBeCloseTo(60 * px, 1);            // 07:00 = 1h in
    expect(top("Lunch")).toBeCloseTo((6 * 60 + 30) * px, 1);     // 12:30 = 6.5h in
  });

  it("fills with water to the hour, and does not animate", () => {
    const { container } = at("#/");
    const water = container.querySelector(".water");
    expect(water).toBeTruthy();
    // Stepped to the hour, because the hour is the finest unit on this ruler.
    const stepped = Math.floor(fromDawn(readNow().minutes) / 60) * 60;
    expect(parseFloat(water.style.height)).toBeCloseTo(stepped * px, 0);
    // No moving surface any more — a level, not a motion.
    expect(water.querySelector(".water-surface")).toBeNull();
    expect(water.querySelector(".water-line")).toBeTruthy();
  });

  it("only the second hand moves continuously", () => {
    expect(CSS).not.toMatch(/@keyframes drift/);
    expect(CSS).not.toMatch(/\.water-body \{[^}]*animation/);
    // The clock's second hand is the only continuous motion.
    expect(CSS).toMatch(/@keyframes slide-in/);
  });

  it("water never blocks what it covers", () => {
    const { container } = at("#/");
    const water = container.querySelector(".water");
    // Behind the entries, hidden from assistive tech, and not interactive.
    expect(water.getAttribute("aria-hidden")).toBe("true");
    expect(water.querySelector("a, button")).toBeNull();
    // It is a sibling of the entry layer, never a wrapper around it.
    expect(water.querySelector(".tl-body")).toBeNull();
    expect(water.contains(container.querySelector("a.ev"))).toBe(false);
    // Entries are still real links underneath it.
    for (const ev of container.querySelectorAll("a.ev")) {
      expect(ev.getAttribute("href")).toMatch(/^#\/task\//);
    }
  });

  it("has no water on a day that is not today", () => {
    const { container } = at(`#/day/${readNow().jdn + 2}`);
    expect(container.querySelector(".water")).toBeNull();
  });

  it("draws rest as a real entry occupying its real height", () => {
    const { container } = at("#/");
    const gaps = [...container.querySelectorAll(".gap")];
    expect(gaps.length).toBeGreaterThan(0);
    const rest = gaps.find((g) => /Rest/.test(g.textContent));
    expect(rest).toBeTruthy();
    // The 07:30->12:30 gap between breakfast and lunch is 300 minutes.
    const big = gaps.map((g) => parseFloat(g.style.height)).sort((a, b) => b - a)[0];
    expect(big).toBeGreaterThan(200 * px);
  });
});

describe("blueprint wiring", () => {
  it("round-trips every rule id", () => {
    for (const id of ["everyday", "weekday", "weekend", "dow0", "dow5", "gc1", "ec1", "holiday"]) {
      expect(ruleIdOf(ruleById(id))).toBe(id);
    }
  });

  it("shows only patterns that exist, most frequent first", () => {
    const { container } = at("#/blueprints");
    const pats = [...container.querySelectorAll(".sq")].filter((c) => c.querySelector(".sq-i"));
    // The five defaults are all daily, so exactly one pattern exists.
    expect(pats).toHaveLength(1);
    expect(pats[0].textContent).toMatch(/Daily/);
    // No empty weekday/weekend shelves invented for us.
    expect(container.textContent).not.toMatch(/Weekends/);
    expect(container.textContent).not.toMatch(/Holidays/);
  });

  it("never writes 'every' on a pattern", () => {
    const { container } = at("#/blueprints");
    for (const p of container.querySelectorAll(".sq")) {
      expect(p.textContent).not.toMatch(/every/i);
    }
  });

  it("opens a pattern as a popup, not a page", () => {
    const { container } = at("#/blueprints");
    // Nothing is open until you ask.
    expect(document.querySelector(".pop")).toBeNull();
    fireEvent.click(container.querySelector(".sq"));
    const pop = document.querySelector(".pop");
    expect(pop.getAttribute("role")).toBe("dialog");
    expect(pop.textContent).toMatch(/Daily/);
    for (const t of ["Wake", "Breakfast", "Lunch", "Dinner", "Sleep"]) {
      expect(within(pop).getByText(t)).toBeTruthy();
    }
    // The page behind it did not change.
    expect(window.location.hash).toBe("#/blueprints");
    expect(container.querySelector(".bp-hero")).toBeTruthy();
  });

  it("closes a popup with escape, and that is not history", () => {
    const { container } = at("#/blueprints");
    fireEvent.click(container.querySelector(".sq"));
    expect(document.querySelector(".pop")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.querySelector(".pop")).toBeNull();
    expect(window.location.hash).toBe("#/blueprints");
  });

  it("offers adding twice: named in the header, minimal by the list", () => {
    const { container } = at("#/blueprints");

    // The page-level action says what it does.
    const hero = container.querySelector(".bp-hero a[href$='/add']");
    expect(hero.textContent).toMatch(/New task/);

    // The one beside the list it adds to is icon-only.
    const inline = container.querySelector(".bp-list-head a.icon-btn");
    expect(inline.getAttribute("href")).toMatch(/\/add$/);
    expect(inline.textContent.trim()).toBe("");
    expect(inline.getAttribute("aria-label")).toBe("New task");

    // Both land in the same place.
    expect(inline.getAttribute("href")).toBe(hero.getAttribute("href"));
  });
});


describe("the Ethiopian clock — the day begins at dawn", () => {
  it("reads 6 in the morning as 12", () => {
    expect(t12(6 * 60)).toBe("12:00");
    expect(parts(6 * 60).night).toBe(false);
  });

  it("reads the defaults the way the user says them", () => {
    expect(t12(6 * 60)).toBe("12:00");        // wake
    expect(t12(7 * 60)).toBe("1:00");         // breakfast
    expect(t12(12 * 60 + 30)).toBe("6:30");   // lunch
    expect(t12(19 * 60 + 30)).toBe("1:30");   // dinner
    expect(t12(22 * 60 + 30)).toBe("4:30");   // sleep
    expect(t12(0)).toBe("6:00");              // midnight
  });

  it("turns over to night at six in the evening", () => {
    expect(parts(17 * 60 + 59).night).toBe(false);
    expect(parts(18 * 60).night).toBe(true);
    expect(t12(18 * 60)).toBe("12:00");
    expect(parts(5 * 60 + 59).night).toBe(true);
    expect(parts(6 * 60).night).toBe(false);
  });

  it("never runs past 12", () => {
    for (let m = 0; m < 1440; m += 7) {
      const p = parts(m);
      expect(p.h).toBeGreaterThanOrEqual(1);
      expect(p.h).toBeLessThanOrEqual(12);
    }
  });

  it("round-trips typed times", () => {
    expect(parseEth("12:00", false)).toBe(6 * 60);
    expect(parseEth("1:00", false)).toBe(7 * 60);
    expect(parseEth("6:30", false)).toBe(12 * 60 + 30);
    expect(parseEth("1:30", true)).toBe(19 * 60 + 30);
    expect(parseEth("4:30", true)).toBe(22 * 60 + 30);
    expect(parseEth("13:00", false)).toBeNull();
  });

  it("uses no am/pm letters anywhere in the UI", () => {
    for (const hash of ["#/", "#/blueprints", `#/task/default:lunch/${readNow().jdn}`]) {
      const { container } = at(hash);
      expect(container.textContent).not.toMatch(/\b(am|pm|AM|PM|a\.m\.|p\.m\.)\b/);
      cleanup();
    }
  });

  it("marks day and night visually instead", () => {
    const { container } = at("#/");
    const marks = container.querySelectorAll(
      '[role="img"][aria-label="day"], [role="img"][aria-label="night"]',
    );
    expect(marks.length).toBeGreaterThan(4);
  });

  it("labels the ruler 12, 1, 2 … starting at dawn", () => {
    const { container } = at("#/");
    // Only the visible window of the ruler is drawn, so assert the shape of
    // the labels rather than their absolute positions.
    const labs = [...container.querySelectorAll(".tl-day.current .tl-hour .lab")]
      .map((l) => l.textContent.trim())
      .filter((t) => /^\d+$/.test(t))
      .map(Number);
    expect(labs.length).toBeGreaterThan(1);
    // Never 13 or higher: this is a 12-hour ruler, dawn-anchored.
    expect(Math.max(...labs)).toBeLessThanOrEqual(12);
    expect(Math.min(...labs)).toBeGreaterThanOrEqual(1);
    // Consecutive hours step by one, wrapping 12 → 1.
    for (let i = 1; i < labs.length; i++) {
      expect(labs[i]).toBe(labs[i - 1] === 12 ? 1 : labs[i - 1] + 1);
    }
  });

  it("shows the clock in Ethiopian form with a mark", () => {
    const { container } = at("#/");
    expect(container.querySelector(".face-digits textPath").textContent).toMatch(/^\d{1,2}:\d{2}$/);
    expect(container.querySelector('.dh-line [role="img"], .face-digits')).toBeTruthy();
  });

  it("fits sleep inside the day instead of overflowing it", () => {
    const { container } = at("#/");
    const sleep = [...container.querySelectorAll(".tl-day.current a.ev")].find((e) =>
      /Sleep/.test(e.textContent),
    );
    const top = parseFloat(sleep.style.top);
    const height = parseFloat(sleep.style.height);
    const canvas = parseFloat(container.querySelector(".tl-day.current").style.height);
    // 22:30 is 16.5h after dawn; +450min lands exactly on the end of the day.
    expect(top).toBeCloseTo(16.5 * 60 * 1.15, 0);
    expect(top + height).toBeLessThanOrEqual(canvas + 1);
  });
});

describe("categories", () => {
  it("a user can create one, colour it, and see their tasks in it", () => {
    const { container } = at("#/blueprints");

    fireEvent.click(container.querySelector(".sq-new"));
    fireEvent.change(document.querySelector("#cn"), { target: { value: "School" } });
    // Colour is already chosen; picking one is a shortcut, not a requirement.
    const swatch = document.querySelectorAll(".pop .swatches .swatch")[2];
    const picked = swatch.style.getPropertyValue("--c");
    fireEvent.click(swatch);
    fireEvent.click(document.querySelectorAll(".pop .iconset .ipick")[0]);
    fireEvent.click(
      [...document.querySelectorAll(".pop button")].find((b) => /Create/.test(b.textContent)),
    );

    expect(document.querySelector(".pop")).toBeNull();
    const cat = container.querySelector(".sq-cat");
    expect(cat.textContent).toMatch(/School/);
    expect(cat.style.getPropertyValue("--c")).toBe(picked);
    const saved = JSON.parse(localStorage.getItem("planner:categories"))[0];
    expect(saved.name).toBe("School");
    expect(saved.icon).toBe("book");

    // Opening it is a popup, not a page.
    fireEvent.click(cat);
    expect(document.querySelector(".pop").textContent).toMatch(/Nothing here yet/);
    expect(window.location.hash).toBe("#/blueprints");
  });

  it("deleting a category releases its tasks instead of deleting them", () => {
    const { container } = at("#/blueprints");
    fireEvent.click(container.querySelector(".sq-new"));
    fireEvent.change(document.querySelector("#cn"), { target: { value: "Home" } });
    fireEvent.click(
      [...document.querySelectorAll(".pop button")].find((b) => /Create/.test(b.textContent)),
    );
    cleanup();

    // Put a default task in it.
    const jdn = readNow().jdn;
    const task = at(`#/task/default:lunch/${jdn}`);
    fireEvent.click(
      [...task.container.querySelectorAll("button.chip.pick")].find((b) => /Home/.test(b.textContent)),
    );
    expect(JSON.parse(localStorage.getItem("planner:defaultCats"))["default:lunch"]).toBeTruthy();
    cleanup();

    const bp = at("#/blueprints");
    fireEvent.click(bp.container.querySelector(".sq-cat"));
    const pop = document.querySelector(".pop");
    expect(pop.textContent).toMatch(/Lunch/);
    fireEvent.click([...pop.querySelectorAll("button")].find((b) => /Delete/.test(b.textContent)));

    // The category square is gone; the task is not.
    expect(bp.container.querySelector(".sq-cat")).toBeNull();
    expect(JSON.parse(localStorage.getItem("planner:categories"))).toEqual([]);
    cleanup();
    // Lunch still exists on the day.
    expect(at("#/").container.textContent).toMatch(/Lunch/);
  });

  it("starts with none — nothing is invented", () => {
    at("#/blueprints");
    expect(JSON.parse(localStorage.getItem("planner:categories") ?? "[]")).toEqual([]);
  });
});

describe("every page is reachable", () => {
  it("the go-anywhere control is on every page", () => {
    for (const hash of ["#/", "#/calendar", "#/blueprints", `#/day/${readNow().jdn}/add`]) {
      const { container } = at(hash);
      expect(container.querySelector("button.go")).toBeTruthy();
      cleanup();
    }
  });

  it("opens a panel with a calendar and links to every top-level page", () => {
    const { container } = at("#/");
    fireEvent.click(container.querySelector("button.go"));
    const panel = document.querySelector(".go-panel");
    expect(panel).toBeTruthy();
    // A calendar you can point at, not just a field.
    expect(panel.querySelectorAll("a.go-day").length).toBeGreaterThan(27);
    const foot = [...panel.querySelectorAll(".go-foot a")].map((a) => a.getAttribute("href"));
    expect(foot).toEqual(["#/", "#/calendar", "#/blueprints", "#/settings"]);
  });

  it("suggests nearby days before anything is typed", () => {
    const { container } = at("#/");
    fireEvent.click(container.querySelector("button.go"));
    const hits = [...document.querySelectorAll(".go-hit")];
    expect(hits.length).toBe(3);
    expect(hits[0].textContent).toMatch(/today/);
  });

  it("every result is a link, so back and forward keep working", () => {
    const { container } = at("#/");
    fireEvent.click(container.querySelector("button.go"));
    fireEvent.change(document.querySelector(".go-input"), { target: { value: "lunch" } });
    for (const h of document.querySelectorAll(".go-hit")) {
      expect(h.tagName).toBe("A");
      expect(h.getAttribute("href")).toMatch(/^#\//);
    }
  });

  it("reaches the neighbouring days without scrolling into them", () => {
    const jdn = readNow().jdn;
    const { container } = at("#/");
    expect(container.querySelector(".adj")).toBeNull();

    // The scroller holds today and nothing else.
    const days = [...container.querySelectorAll(".tl-day")];
    expect(days).toHaveLength(1);
    expect(days[0].closest(".tl-scroll")).toBeTruthy();

    // Both neighbours are one deliberate click away, and the affordances sit
    // outside the scrolling area rather than at the far end of it.
    const divs = [...container.querySelectorAll("a.tl-div")];
    const hrefs = divs.map((a) => a.getAttribute("href"));
    expect(hrefs).toContain(`#/day/${jdn + 1}`);
    expect(hrefs).toContain(`#/day/${jdn - 1}`);
    for (const d of divs) expect(d.closest(".tl-scroll")).toBeNull();
  });

  it("reaches the add page and the task page from the day", () => {
    const jdn = readNow().jdn;
    const { container } = at(`#/day/${jdn}`);
    expect(container.querySelector('a.ev[href^="#/task/"]')).toBeTruthy();
    cleanup();
    expect(at(`#/day/${jdn}/add`).container.querySelector("#t")).toBeTruthy();
  });
});

describe("blueprints do not look like the day page", () => {
  it("uses a schedule strip, not a timeline", () => {
    const { container } = at("#/blueprints");
    fireEvent.click(container.querySelector(".sq"));
    const pop = document.querySelector(".pop");
    // No 24-hour canvas, no hour ruler, no water.
    expect(pop.querySelector(".tl-day")).toBeNull();
    expect(pop.querySelector(".tl-hour")).toBeNull();
    expect(pop.querySelector(".water")).toBeNull();
    expect(pop.querySelectorAll(".sched .slot").length).toBe(6);
  });

  it("sizes each slot bar by duration", () => {
    const { container } = at("#/blueprints");
    fireEvent.click(container.querySelector(".sq"));
    const bars = [...document.querySelectorAll(".pop .slot")]
      .filter((s) => s.querySelector(".slot-bar"))
      .map((s) => ({
        name: s.querySelector(".slot-n").textContent,
        w: Number(s.querySelector(".slot-bar").style.getPropertyValue("--w")),
      }));
    const by = Object.fromEntries(bars.map((b) => [b.name, b.w]));
    expect(by.Sleep).toBeGreaterThan(by.Lunch);
    expect(by.Lunch).toBeGreaterThan(by.Breakfast);
    // Wake has no bar at all — it is a moment.
    expect(by.Wake).toBeUndefined();
  });

  it("orders a blueprint from dawn, so wake comes first", () => {
    const { container } = at("#/blueprints");
    fireEvent.click(container.querySelector(".sq"));
    const names = [...document.querySelectorAll(".pop .slot-n")].map((n) => n.textContent);
    // Water is planned at 6:30, after waking.
    expect(names).toEqual(["Wake", "Drink water", "Breakfast", "Lunch", "Dinner", "Sleep"]);
  });
});

describe("moments are lines, not blocks", () => {
  it("draws wake as a hairline with no height", () => {
    const { container } = at("#/");
    const mo = container.querySelector("a.mo");
    expect(mo).toBeTruthy();
    expect(mo.textContent).toMatch(/Wake/);
    // No height at all — it marks an instant.
    expect(mo.style.height).toBe("");
    expect(mo.querySelector(".mo-dot")).toBeTruthy();
    expect(mo.querySelector(".mo-line")).toBeTruthy();
  });

  it("gives it no block among the timed entries", () => {
    const { container } = at("#/");
    const titles = [...container.querySelectorAll(".tl-day.current a.ev .ev-title")].map((t) => t.textContent);
    expect(titles).toEqual(["Breakfast", "Lunch", "Dinner", "Sleep"]);
    expect(titles).not.toContain("Wake");
  });

  it("sits exactly on its minute — dawn", () => {
    const { container } = at("#/");
    expect(parseFloat(container.querySelector(".tl-day.current a.mo").style.top)).toBeCloseTo(0, 1);
  });

  it("is still a link to its own page", () => {
    const { container } = at("#/");
    expect(container.querySelector("a.mo").getAttribute("href")).toMatch(/^#\/task\/default:wake\//);
  });

  it("shows no duration for it on the blueprint either", () => {
    const { container } = at("#/blueprints");
    fireEvent.click(container.querySelector(".sq"));
    const wake = [...document.querySelectorAll(".pop .slot")].find((s) =>
      /Wake/.test(s.querySelector(".slot-n").textContent),
    );
    expect(wake.querySelector(".slot-d").textContent).toBe("moment");
    expect(wake.querySelector(".slot-moment")).toBeTruthy();
    expect(wake.querySelector(".slot-bar")).toBeNull();
  });
});

describe("the now strip — recent, current, next", () => {
  it("appears on today", () => {
    const { container } = at("#/");
    expect(container.querySelector(".ns")).toBeTruthy();
  });

  it("does not appear on another day, which has no 'now'", () => {
    const { container } = at(`#/day/${readNow().jdn + 2}`);
    expect(container.querySelector(".ns")).toBeNull();
  });

  it("gives weight to exactly one thing — the current task", () => {
    const { container } = at("#/");
    const now = container.querySelectorAll(".ns-now, .ns-open");
    expect(now).toHaveLength(1);
  });

  it("shows a bounded number of past and future rows", () => {
    const { container } = at("#/");
    expect(container.querySelectorAll(".ns-past").length).toBeLessThanOrEqual(2);
    expect(container.querySelectorAll(".ns-next").length).toBeLessThanOrEqual(3);
  });

  it("keeps past rows neutral — no failure language, no strike-through", () => {
    const { container } = at("#/");
    const ns = container.querySelector(".ns");
    expect(ns.textContent).not.toMatch(/missed|late|failed|overdue/i);
  });

  it("every row is a link to its task", () => {
    const { container } = at("#/");
    for (const r of container.querySelectorAll("a.ns-row")) {
      expect(r.getAttribute("href")).toMatch(/^#\/task\//);
    }
  });

  it("says so plainly when nothing is scheduled", () => {
    const { container } = at("#/");
    const open = container.querySelector(".ns-open");
    if (open) expect(open.textContent).toMatch(/Nothing scheduled right now/);
  });
});

describe("view kinds", () => {
  it("only full views change the hash", () => {
    const { container } = at("#/blueprints");
    const before = window.location.hash;
    fireEvent.click(container.querySelector(".sq"));      // popup
    expect(window.location.hash).toBe(before);
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(container.querySelector("button.go")); // half
    expect(window.location.hash).toBe(before);
  });

  it("a popup traps its own dismissal, not the page's history", () => {
    const { container } = at("#/blueprints");
    fireEvent.click(container.querySelector(".sq"));
    const pop = document.querySelector(".pop");
    expect(pop.getAttribute("aria-modal")).toBe("true");
    fireEvent.click(document.querySelector(".pop-x"));
    expect(document.querySelector(".pop")).toBeNull();
  });

  it("navigating closes anything open on top", () => {
    const { container } = at("#/blueprints");
    fireEvent.click(container.querySelector(".sq"));
    expect(document.querySelector(".pop")).toBeTruthy();
    window.location.hash = "#/";
    fireEvent(window, new HashChangeEvent("hashchange"));
    expect(document.querySelector(".pop")).toBeNull();
  });

  it("the new-category square matches the others and carries no label", () => {
    const { container } = at("#/blueprints");
    const mk = container.querySelector(".sq-new");
    expect(mk.classList.contains("sq")).toBe(true);
    // No label text — the plus and the dashed edge say it.
    expect(mk.textContent.trim()).toBe("");
    expect(mk.getAttribute("aria-label")).toBe("New category");
    expect(mk.querySelector("svg")).toBeTruthy();
  });
});

describe("settings and demo content", () => {
  it("is reachable from blueprints and has real preferences", () => {
    const bp = at("#/blueprints");
    expect(bp.container.querySelector('a[href="#/settings"]')).toBeTruthy();
    cleanup();
    const { container } = at("#/settings");
    expect(container.querySelectorAll(".pref").length).toBeGreaterThan(5);
    expect(container.querySelectorAll('[role="switch"]').length).toBeGreaterThan(2);
  });

  it("still shows nothing invented until the demo is asked for", () => {
    at("#/blueprints");
    expect(JSON.parse(localStorage.getItem("planner:categories") ?? "[]")).toEqual([]);
    expect(JSON.parse(localStorage.getItem("planner:tasks") ?? "[]")).toEqual([]);
  });

  it("loads demo content on request, and clears it again", () => {
    const s = at("#/settings");
    fireEvent.click(
      [...s.container.querySelectorAll("button")].find((b) => /Load demo/.test(b.textContent)),
    );
    expect(JSON.parse(localStorage.getItem("planner:tasks")).length).toBeGreaterThan(15);
    expect(JSON.parse(localStorage.getItem("planner:categories")).length).toBe(6);
    cleanup();

    // Enough content to judge how the strips scroll.
    const bp = at("#/blueprints");
    expect(bp.container.querySelectorAll(".sq-cat").length).toBe(6);
    expect(bp.container.querySelectorAll(".sq").length).toBeGreaterThan(9);
    expect(bp.container.querySelectorAll(".trow").length).toBeGreaterThan(20);
    cleanup();

    const s2 = at("#/settings");
    fireEvent.click(
      [...s2.container.querySelectorAll("button")].find((b) => /Clear everything/.test(b.textContent)),
    );
    expect(JSON.parse(localStorage.getItem("planner:tasks"))).toEqual([]);
  });

  it("a toggle actually changes the stored preference", () => {
    const { container } = at("#/settings");
    const sw = container.querySelector('[role="switch"]');
    const before = sw.getAttribute("aria-checked");
    fireEvent.click(sw);
    expect(container.querySelector('[role="switch"]').getAttribute("aria-checked")).not.toBe(before);
  });
});

describe("blueprints is split, and lists everything", () => {
  it("has a top half of shelves and a bottom half of tasks", () => {
    const { container } = at("#/blueprints");
    expect(container.querySelector(".bp-top")).toBeTruthy();
    expect(container.querySelector(".bp-bottom")).toBeTruthy();
    // Every task appears in the list, defaults included.
    expect(container.querySelectorAll(".trow").length).toBe(6);
  });

  it("shows information for each task, not just a name", () => {
    const { container } = at("#/blueprints");
    const row = container.querySelector(".trow");
    for (const cls of [".tc-time", ".tc-name", ".tc-dur", ".tc-pat", ".tc-cat", ".tc-place"]) {
      expect(row.querySelector(cls)).toBeTruthy();
    }
  });

  it("can be re-sorted", () => {
    const { container } = at("#/blueprints");
    const names = () => [...container.querySelectorAll(".tc-name")].map((n) => n.textContent);
    const byTime = names();
    fireEvent.click([...container.querySelectorAll(".seg button")].find((b) => b.textContent === "Name"));
    expect(names()).not.toEqual(byTime);
    expect(names()).toEqual([...names()].sort());
  });

  it("centres the headings but leaves the items in their order", () => {
    const { container } = at("#/blueprints");
    // The label is centred.
    expect(container.querySelector(".section.centered")).toBeTruthy();
    expect(CSS).toMatch(/\.section\.centered \{[^}]*text-align: center/);
    // The row itself is not — order is meaningful, so it starts at the left.
    expect(CSS).not.toMatch(/\.card-strip[^{]*\{[^}]*justify-content: (safe )?center/);
    expect(container.querySelector(".card-strip").className).not.toMatch(/centered/);
  });

  it("opens patterns and categories wider than go-anywhere", () => {
    const { container } = at("#/blueprints");
    fireEvent.click(container.querySelector(".sq"));
    expect(document.querySelector(".pop").classList.contains("pop-wide")).toBe(true);
    expect(CSS).toMatch(/\.pop-wide \{[^}]*min-height/);
  });
});

describe("categories are optional and unconstrained", () => {
  it("needs only a name", () => {
    const { container } = at("#/blueprints");
    fireEvent.click(container.querySelector(".sq-new"));
    const create = [...document.querySelectorAll(".pop button")].find((b) => /Create/.test(b.textContent));
    expect(create.disabled).toBe(true);
    fireEvent.change(document.querySelector("#cn"), { target: { value: "Solo" } });
    // No colour or icon chosen, yet it is already valid.
    expect([...document.querySelectorAll(".pop button")]
      .find((b) => /Create/.test(b.textContent)).disabled).toBe(false);
  });

  it("accepts any colour, not just the presets", () => {
    const { container } = at("#/blueprints");
    fireEvent.click(container.querySelector(".sq-new"));
    const custom = document.querySelector('.pop input[type="color"]');
    expect(custom).toBeTruthy();
    fireEvent.change(document.querySelector("#cn"), { target: { value: "Odd" } });
    fireEvent.change(custom, { target: { value: "#123456" } });
    fireEvent.click([...document.querySelectorAll(".pop button")].find((b) => /Create/.test(b.textContent)));
    expect(JSON.parse(localStorage.getItem("planner:categories"))[0].color).toBe("#123456");
  });

  it("offers an icon set", () => {
    const { container } = at("#/blueprints");
    fireEvent.click(container.querySelector(".sq-new"));
    expect(document.querySelectorAll(".pop .iconset .ipick").length).toBeGreaterThan(8);
  });

  it("uses rounded squares for picking, not circles", () => {
    expect(CSS).toMatch(/\.swatch \{[^}]*border-radius: 10px/);
  });
});

describe("the day does not change by accident", () => {
  it("lets you scroll freely between days, with no gate", () => {
    const { container } = at("#/");
    // No confirm bar, and nothing to click before you may scroll.
    expect(container.querySelector(".tl-jump")).toBeNull();
    const src = readFileSync("src/app/Timeline.jsx", "utf8");
    expect(src).not.toMatch(/setArmed/);
    // Scrolling still never rewrites the URL out from under you.
    expect(src).not.toMatch(/onScroll[\s\S]{0,400}window\.location\.hash =/);
  });

  it("puts the now strip beside Today, not beside the timeline", () => {
    const { container } = at("#/");
    const top = container.querySelector(".day-top");
    expect(top).toBeTruthy();
    // Header and strip share the top row; the clock keeps its own corner.
    expect(top.querySelector(".dh")).toBeTruthy();
    expect(top.querySelector(".ns")).toBeTruthy();
    expect(container.querySelector(".day-split .ns")).toBeNull();
    expect(CSS).toMatch(/\.day-top \{[^}]*display: flex/);
  });
});

describe("the task-form prototype", () => {
  it("renders three structurally different variants", () => {
    const a = at("#/prototype/form/A").container;
    expect(a.querySelectorAll(".section").length).toBeGreaterThan(2); // grouped ladder
    expect(a.querySelector(".steps")).toBeNull();
    cleanup();

    const b = at("#/prototype/form/B").container;
    expect(b.querySelectorAll(".step").length).toBe(3);
    cleanup();

    const c = at("#/prototype/form/C").container;
    expect(c.querySelector(".sentence")).toBeTruthy();
    expect(c.querySelectorAll(".blank").length).toBeGreaterThan(3);
  });

  it("every variant treats frequency as required", () => {
    for (const v of ["A", "B", "C"]) {
      const { container } = at(`#/prototype/form/${v}`);
      expect(container.textContent).toMatch(/how often|required/i);
      expect(container.querySelector(".req")).toBeTruthy();
      cleanup();
    }
  });

  it("no variant can be submitted without a frequency", () => {
    for (const v of ["A", "C"]) {
      const { container } = at(`#/prototype/form/${v}`);
      fireEvent.change(container.querySelector('input[placeholder="do what?"], .input'), {
        target: { value: "Read" },
      });
      const add = [...container.querySelectorAll("button")].find((b) => /Add/.test(b.textContent));
      expect(add.disabled).toBe(true);
      expect(container.textContent).toMatch(/how often/i);
      cleanup();
    }
  });

  it("every variant has a description field", () => {
    for (const v of ["A", "B", "C"]) {
      const { container } = at(`#/prototype/form/${v}`);
      expect(container.querySelector("textarea")).toBeTruthy();
      cleanup();
    }
  });

  it("is marked throwaway and can get back", () => {
    const { container } = at("#/prototype/form/A");
    expect(container.querySelector(".proto-tag").textContent).toMatch(/throwaway/i);
    expect(container.querySelector('a[href="#/settings"]')).toBeTruthy();
    expect(container.querySelector(".switcher")).toBeTruthy();
    // The stage is visibly not the real app.
    expect(container.querySelector(".proto-stage")).toBeTruthy();
  });
});

describe("prototypes are a section of go anywhere", () => {
  const enableProto = () => {
    const s = at("#/settings");
    const sw = [...s.container.querySelectorAll(".pref")]
      .find((r) => /Prototype mode/.test(r.textContent))
      .querySelector('[role="switch"]');
    fireEvent.click(sw);
    cleanup();
  };

  it("searching 'prototype' lists them in the panel", () => {
    enableProto();
    const { container } = at("#/");
    fireEvent.click(container.querySelector("button.go"));
    fireEvent.change(document.querySelector(".go-field input"), { target: { value: "prototype" } });
    const rows = [...document.querySelectorAll(".go-list .go-hit")];
    expect(rows.length).toBeGreaterThan(3);
    expect(rows.every((r) => /Prototype/.test(r.textContent))).toBe(true);
  });

  it("choosing one goes straight to that variant", () => {
    enableProto();
    const { container } = at("#/");
    fireEvent.click(container.querySelector("button.go"));
    fireEvent.change(document.querySelector(".go-field input"), { target: { value: "button" } });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(window.location.hash).toMatch(/^#\/prototype\/addbtn\/[A-D]$/);
  });

  it("stays out of the way until prototype mode is on", () => {
    const { container } = at("#/");
    fireEvent.click(container.querySelector("button.go"));
    fireEvent.change(document.querySelector(".go-field input"), { target: { value: "prototype" } });
    expect([...document.querySelectorAll(".go-list .go-hit")]
      .some((r) => /Prototype/.test(r.textContent))).toBe(false);
  });

  it("the register is the only list — settings reads from it", () => {
    const { container } = at("#/settings");
    const links = [...container.querySelectorAll('a[href^="#/prototype/"]')];
    expect(links.length).toBe(PROTOTYPES.length);
    for (const p of PROTOTYPES) {
      expect(links.some((l) => l.getAttribute("href").includes(`/${p.id}/`))).toBe(true);
    }
  });
});

describe("the add-button prototype", () => {
  it("offers four genuinely different placements", () => {
    const seen = new Set();
    for (const [v, sel] of [["A", ".quiet-add"], ["B", ".outline-add"], ["C", ".fab"], ["D", ".sq-add"]]) {
      const { container } = at(`#/prototype/addbtn/${v}`);
      expect(container.querySelector(sel)).toBeTruthy();
      seen.add(sel);
      cleanup();
    }
    expect(seen.size).toBe(4);
  });

  it("shows the button in place, against real page furniture", () => {
    const { container } = at("#/prototype/addbtn/A");
    expect(container.querySelector(".bp-hero")).toBeTruthy();
    expect(container.querySelector(".card-strip")).toBeTruthy();
    expect(container.querySelectorAll(".trow").length).toBeGreaterThan(3);
  });

  it("names the trade-off rather than only showing it", () => {
    const { container } = at("#/prototype/addbtn/C");
    expect(container.querySelector(".proto-note").textContent).toMatch(/go-anywhere/i);
  });

  it("keeps the strip items in order, headings centred", () => {
    const { container } = at("#/prototype/addbtn/D");
    // The add card leads the strip; the new-category square follows it.
    const kids = [...container.querySelector(".card-strip").children];
    expect(kids[0].classList.contains("sq-add")).toBe(true);
    expect(kids[1].classList.contains("sq-new")).toBe(true);
  });

  it("cycles through all four", () => {
    const { container } = at("#/prototype/addbtn/A");
    expect(container.querySelector(".sw-count").textContent).toBe("1/4");
    const next = container.querySelector('.switcher a[aria-label="Next variant"]');
    expect(next.getAttribute("href")).toBe("#/prototype/addbtn/B");
  });
});

describe("the strips actually scroll", () => {
  it("keeps cards at a fixed width so the row overflows", () => {
    // flex:0 0 auto lets a card shrink to its content; a fixed basis does not.
    expect(CSS).toMatch(/\.sq \{[^}]*flex: 0 0 128px/);
    expect(CSS).toMatch(/\.card-strip \{[^}]*flex-wrap: nowrap/);
    expect(CSS).toMatch(/\.card-strip \{[^}]*overflow-x: auto/);
    // A flex child will not overflow its parent without this.
    expect(CSS).toMatch(/\.card-strip \{[^}]*min-width: 0/);
  });

  it("shows a scrollbar rather than hiding it", () => {
    expect(CSS).not.toMatch(/\.card-strip::-webkit-scrollbar \{ display: none/);
    expect(CSS).toMatch(/\.card-strip::-webkit-scrollbar \{[^}]*height/);
  });

  it("has enough demo content to overflow", () => {
    const s = at("#/settings");
    fireEvent.click([...s.container.querySelectorAll("button")].find((b) => /Load demo/.test(b.textContent)));
    cleanup();
    const { container } = at("#/blueprints");
    const strips = container.querySelectorAll(".card-strip");
    // Patterns strip and categories strip, both past a screen's worth.
    expect(strips[0].children.length).toBeGreaterThan(8);
    expect(strips[1].children.length).toBeGreaterThan(5);
  });
});

describe("hydration is built in", () => {
  it("ships as a default, like waking and eating", () => {
    const { container } = at("#/blueprints");
    expect(container.textContent).toMatch(/Drink water/);
  });

  it("is placed through the day, not left as one floating total", () => {
    const { container } = at("#/");
    // No detached band above the day.
    expect(container.querySelector(".spread-band")).toBeNull();
    // Instead, real marks at real times on the ruler.
    const sips = container.querySelectorAll(".tl-day.current .sip");
    expect(sips.length).toBe(8);
    expect(sips[0].getAttribute("title")).toMatch(/Drink water/);
  });

  it("takes no room on the ruler — a sip does not interrupt a lesson", () => {
    const { container } = at("#/");
    const sip = container.querySelector(".sip");
    expect(sip.style.height).toBe("");
    // It is not a block and not a gap.
    expect(sip.classList.contains("ev")).toBe(false);
  });

  it("records a sip in one tap, from the timeline", () => {
    const { container } = at("#/");
    const sips = container.querySelectorAll(".tl-day.current .sip");
    fireEvent.click(sips[0]);
    expect(JSON.parse(localStorage.getItem("planner:entries"))[0].amount).toBe(310);
    fireEvent.click(container.querySelectorAll(".tl-day.current .sip")[1]);
    expect(JSON.parse(localStorage.getItem("planner:entries"))[0].amount).toBe(620);
  });

  it("marks the ones already taken", () => {
    const { container } = at("#/");
    fireEvent.click(container.querySelectorAll(".tl-day.current .sip")[0]);
    expect(container.querySelectorAll(".tl-day.current .sip.done").length).toBe(1);
  });

  it("still reads as a whole on its own page", () => {
    const { container } = at("#/");
    fireEvent.click(container.querySelectorAll(".tl-day.current .sip")[0]);
    cleanup();
    const t = at(`#/task/default:water/${readNow().jdn}`);
    expect(t.container.querySelector(".tally-read").textContent).toMatch(/310 \/ 2500 ml/);
    expect(t.container.querySelector(".tally-pace")).toBeTruthy();
    expect(t.container.textContent).not.toMatch(/behind|fail|should have/i);
  });
});

describe("the timeline zooms", () => {
  it("reads as a percentage, with the spacing underneath", () => {
    const { container } = at("#/");
    expect(container.querySelector('[aria-label="Zoom in"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Zoom out"]')).toBeTruthy();
    const l = container.querySelector(".tl-zoom-l");
    expect(l.textContent).toMatch(/^100%/);
    expect(l.querySelector("small").textContent).toBe("1 hr");
  });

  it("sits at the bottom of the timeline, not the top", () => {
    expect(CSS).toMatch(/\.tl-zoom \{[^}]*bottom:/);
    expect(CSS).not.toMatch(/\.tl-zoom \{[^}]*top: -40px/);
  });

  it("adds finer lines as you zoom in", () => {
    const { container } = at("#/");
    fireEvent.click(container.querySelector('[aria-label="Zoom in"]'));
    expect(container.querySelector(".tl-zoom-l small").textContent).toBe("30 min");
    expect(container.querySelector(".tl-hour.sub")).toBeTruthy();
  });

  it("goes all the way to half-minute lines", () => {
    const { container } = at("#/");
    for (let i = 0; i < 20; i++) {
      const b = container.querySelector('[aria-label="Zoom in"]');
      if (b.disabled) break;
      fireEvent.click(b);
    }
    expect(container.querySelector(".tl-zoom-l small").textContent).toBe("30 sec");
  });

  it("makes the day taller when zoomed in", () => {
    const { container } = at("#/");
    const h = () => parseFloat(container.querySelector(".tl-day").style.height);
    const before = h();
    fireEvent.click(container.querySelector('[aria-label="Zoom in"]'));
    expect(h()).toBeGreaterThan(before);
  });

  it("stops at the ends rather than zooming forever", () => {
    const { container } = at("#/");
    for (let i = 0; i < 20; i++) {
      const b = container.querySelector('[aria-label="Zoom in"]');
      if (b.disabled) break;
      fireEvent.click(b);
    }
    expect(container.querySelector('[aria-label="Zoom in"]').disabled).toBe(true);
  });

  it("remembers the zoom", () => {
    const { container } = at("#/");
    fireEvent.click(container.querySelector('[aria-label="Zoom in"]'));
    expect(JSON.parse(localStorage.getItem("planner:settings")).zoom).toBeGreaterThan(1);
  });
});

describe("opening today lands on what you are doing", () => {
  it("scrolls the page to the current or last task, not to the top", () => {
    // The page is the scroller now, so this is a window scroll. jsdom does
    // not lay out, so assert the call was made rather than the pixel value.
    const spy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    try {
      at("#/");
      expect(spy).toHaveBeenCalled();
      const arg = spy.mock.calls.at(-1)[0];
      expect(typeof arg).toBe("object");
      expect(arg).toHaveProperty("top");
      expect(Number.isFinite(arg.top)).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  it("anchors on a task rather than the raw clock", () => {
    const src = readFileSync("src/app/Timeline.jsx", "utf8");
    expect(src).toMatch(/current \?\? previous/);
  });
});

describe("scheduling shows conflicts instead of refusing", () => {
  const addWith = (start, dur = "60") => {
    const r = at(`#/day/${readNow().jdn}/add`);
    fireEvent.change(r.container.querySelector("#t"), { target: { value: "Study" } });
    fireEvent.change(r.container.querySelector("#f"), { target: { value: "once" } });
    fireEvent.change(r.container.querySelector("#s"), { target: { value: start } });
    fireEvent.change(r.container.querySelector("#d"), { target: { value: dur } });
    return r;
  };

  it("says nothing when the slot is free", () => {
    const { container } = addWith("4:00");
    expect(container.querySelector(".clash")).toBeNull();
  });

  it("draws the overlap when there is one", () => {
    // Lunch is 12:30–13:15 clock = 6:30 dawn-anchored.
    const { container } = addWith("6:30", "45");
    const clash = container.querySelector(".clash");
    expect(clash).toBeTruthy();
    expect(clash.textContent).toMatch(/Lunch/);
    // Both bars are drawn, so the collision is visible not just described.
    expect(clash.querySelector(".clash-them")).toBeTruthy();
    expect(clash.querySelector(".clash-mine")).toBeTruthy();
  });

  it("still lets you add it — overlapping is sometimes right", () => {
    const { container } = addWith("6:30", "45");
    expect(container.querySelector('form button[type="submit"]').disabled).toBe(false);
    expect(container.querySelector(".clash-foot").textContent).toMatch(/still add it/i);
  });

  it("offers the nearest slot that fits", () => {
    const { container } = addWith("6:30", "45");
    const move = [...container.querySelectorAll(".clash-foot button")]
      .find((b) => /Move to/.test(b.textContent));
    expect(move).toBeTruthy();
    fireEvent.click(move);
    expect(container.querySelector(".clash")).toBeNull();
  });
});

describe("prototype mode", () => {
  it("is off to begin with", () => {
    const { container } = at("#/");
    expect(container.querySelector(".proto-live")).toBeNull();
  });

  it("marks the app once it is on", () => {
    const s = at("#/settings");
    fireEvent.click([...s.container.querySelectorAll(".pref")]
      .find((r) => /Prototype mode/.test(r.textContent))
      .querySelector('[role="switch"]'));
    cleanup();
    const { container } = at("#/");
    expect(container.querySelector(".proto-live")).toBeTruthy();
  });
});

describe("nothing steals focus", () => {
  it("does not open the panel on a bare keystroke", () => {
    const { container } = at("#/");
    fireEvent.keyDown(window, { key: "/" });
    expect(document.querySelector(".go-panel")).toBeNull();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(document.querySelector(".go-panel")).toBeNull();
    fireEvent.keyDown(window, { key: "a" });
    expect(document.querySelector(".go-panel")).toBeNull();
  });

  it("advertises no keyboard shortcut it does not honour", () => {
    const { container } = at("#/");
    expect(container.querySelector("button.go kbd")).toBeNull();
  });

  it("binds nothing globally while closed", () => {
    const src = readFileSync("src/app/Nav.jsx", "utf8");
    // The listener is registered only inside the open branch.
    expect(src).toMatch(/if \(!open\) return undefined;[\s\S]{0,600}addEventListener\("keydown"/);
  });

  it("still takes keys once you have opened it yourself", () => {
    const { container } = at("#/");
    fireEvent.click(container.querySelector("button.go"));
    expect(document.querySelector(".go-panel")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.querySelector(".go-panel")).toBeNull();
  });
});

describe("prototypes appear inside the go-anywhere panel", () => {
  const enable = () => {
    const s = at("#/settings");
    fireEvent.click([...s.container.querySelectorAll(".pref")]
      .find((r) => /Prototype mode/.test(r.textContent))
      .querySelector('[role="switch"]'));
    cleanup();
  };

  it("gets its own labelled section, apart from real destinations", () => {
    enable();
    const { container } = at("#/");
    fireEvent.click(container.querySelector("button.go"));
    fireEvent.change(document.querySelector(".go-field input"), { target: { value: "calendar" } });
    const heads = [...document.querySelectorAll(".go-sec-h")].map((h) => h.textContent);
    expect(heads).toContain("Prototypes");
    expect(heads).toContain("Go to");
  });

  it("carries the switch itself, pressed, when the mode is on", () => {
    enable();
    const { container } = at("#/");
    fireEvent.click(container.querySelector("button.go"));
    const flag = document.querySelector("button.go-proto");
    expect(flag).not.toBeNull();
    expect(flag.textContent).toMatch(/Prototype mode/);
    expect(flag.getAttribute("aria-pressed")).toBe("true");
    expect(flag.className).toMatch(/\bon\b/);
  });

  it("turns the mode on from inside the panel, without leaving it", () => {
    const { container } = at("#/");
    fireEvent.click(container.querySelector("button.go"));
    expect(document.querySelectorAll(".go-hit").length).toBeGreaterThan(0);
    const before = [...document.querySelectorAll(".go-sec-h")].map((h) => h.textContent);
    expect(before).not.toContain("Prototypes");

    fireEvent.click(document.querySelector("button.go-proto"));

    // the panel is still open, and the prototypes are now listed in it
    expect(document.querySelector(".go-panel")).not.toBeNull();
    const after = [...document.querySelectorAll(".go-sec-h")].map((h) => h.textContent);
    expect(after).toContain("Prototypes");
    expect(document.querySelector("button.go-proto").getAttribute("aria-pressed")).toBe("true");
  });

  it("turns the mode back off again, and the prototypes go with it", () => {
    enable();
    const { container } = at("#/");
    fireEvent.click(container.querySelector("button.go"));
    expect([...document.querySelectorAll(".go-sec-h")].map((h) => h.textContent))
      .toContain("Prototypes");
    fireEvent.click(document.querySelector("button.go-proto"));
    expect(document.querySelector(".go-panel")).not.toBeNull();
    expect([...document.querySelectorAll(".go-sec-h")].map((h) => h.textContent))
      .not.toContain("Prototypes");
    expect(document.querySelector("button.go-proto").getAttribute("aria-pressed")).toBe("false");
  });

  it("remembers the choice the panel made", () => {
    const { container } = at("#/");
    fireEvent.click(container.querySelector("button.go"));
    fireEvent.click(document.querySelector("button.go-proto"));
    expect(JSON.parse(localStorage.getItem("planner:settings")).prototypeMode).toBe(true);
  });

  it("shows no such section when the mode is off", () => {
    const { container } = at("#/");
    fireEvent.click(container.querySelector("button.go"));
    fireEvent.change(document.querySelector(".go-field input"), { target: { value: "calendar" } });
    expect([...document.querySelectorAll(".go-sec-h")].map((h) => h.textContent))
      .not.toContain("Prototypes");
    // the switch is always there — that is how you turn the mode on
    const flag = document.querySelector("button.go-proto");
    expect(flag.getAttribute("aria-pressed")).toBe("false");
    expect(flag.className).not.toMatch(/\bon\b/);
  });
});

describe("settings reaches every page", () => {
  it("is in the bar on every page", () => {
    for (const route of ["#/", "#/calendar", "#/blueprints", `#/task/default:lunch/${readNow().jdn}`]) {
      const { container } = at(route);
      expect(container.querySelector('a[href="#/settings"]')).toBeTruthy();
      cleanup();
    }
  });

  it("does not put adding in the chrome — most pages are not for adding", () => {
    for (const route of ["#/", "#/calendar", `#/task/default:lunch/${readNow().jdn}`]) {
      const { container } = at(route);
      expect(container.querySelector(".top a[href$='/add']")).toBeNull();
      cleanup();
    }
  });

  it("has a bare #/add that means today", () => {
    at("#/add");
    expect(document.querySelector("#t")).toBeTruthy();
  });
});

describe("the day header follows the timeline", () => {
  it("names the day and opens a calendar when clicked", () => {
    const { container } = at("#/");
    const title = container.querySelector("button.dh-title");
    expect(title.textContent).toMatch(/Today/);
    fireEvent.click(title);
    const pop = document.querySelector(".pop");
    expect(pop).toBeTruthy();
    expect(pop.querySelector(".mini-grid")).toBeTruthy();
    // A window over the page — the hash is untouched.
    expect(window.location.hash).toBe("#/");
  });

  it("picking a day navigates and closes", () => {
    const { container } = at("#/");
    fireEvent.click(container.querySelector("button.dh-title"));
    const days = document.querySelectorAll(".mini-day");
    fireEvent.click(days[0]);
    expect(window.location.hash).toMatch(/^#\/day\/\d+$/);
    expect(document.querySelector(".pop")).toBeNull();
  });

  it("marks today and the day being looked at", () => {
    const { container } = at("#/");
    fireEvent.click(container.querySelector("button.dh-title"));
    expect(document.querySelector(".mini-day.today")).toBeTruthy();
    expect(document.querySelector(".mini-day.on")).toBeTruthy();
  });
});

describe("the calendar is not squished", () => {
  it("lets every weekday column shrink evenly", () => {
    // 1fr floors at min-content, so the last columns get crushed by their
    // own text; minmax(0,1fr) is what actually divides the width evenly.
    expect(CSS).toMatch(/\.cal-grid \{[^}]*repeat\(7, minmax\(0, 1fr\)\)/);
    expect(CSS).toMatch(/\.go-grid \{[^}]*repeat\(7, minmax\(0, 1fr\)\)/);
    expect(CSS).toMatch(/\.mini-grid \{[^}]*repeat\(7, minmax\(0, 1fr\)\)/);
  });

  it("still renders all seven columns with content", () => {
    const { container } = at("#/calendar");
    expect(container.querySelectorAll(".cal-dow").length).toBe(7);
    expect(container.querySelectorAll(".cell:not(.blank)").length).toBeGreaterThan(27);
  });
});

describe("the calendar-shape prototype", () => {
  it("offers grid, day list, and both", () => {
    const a = at("#/prototype/calview/A").container;
    expect(a.querySelector(".cal-grid")).toBeTruthy();
    expect(a.querySelector(".dl")).toBeNull();
    cleanup();

    const b = at("#/prototype/calview/B").container;
    expect(b.querySelector(".dl-rows")).toBeTruthy();
    expect(b.querySelectorAll(".dl-row").length).toBeGreaterThan(27);
    cleanup();

    const c = at("#/prototype/calview/C").container;
    expect(c.querySelectorAll(".seg button").length).toBe(2);
  });

  it("the day list previews the selected day beside it", () => {
    const { container } = at("#/prototype/calview/B");
    const prev = container.querySelector(".dl-prev");
    expect(prev).toBeTruthy();
    fireEvent.click(container.querySelectorAll(".dl-row")[4]);
    expect(container.querySelector(".dl-prev-h").textContent).toBeTruthy();
  });

  it("each row previews its own day in miniature", () => {
    const { container } = at("#/prototype/calview/B");
    expect(container.querySelector(".dl-row .dl-bar")).toBeTruthy();
    expect(container.querySelector(".dl-row .dl-names")).toBeTruthy();
  });

  it("names the trade-off of each shape", () => {
    for (const v of ["A", "B", "C"]) {
      const { container } = at(`#/prototype/calview/${v}`);
      expect(container.querySelector(".proto-note").textContent.length).toBeGreaterThan(30);
      cleanup();
    }
  });
});

describe("the task form prototype shows the schedule", () => {
  it("draws the day in every variant", () => {
    for (const v of ["A", "C"]) {
      const { container } = at(`#/prototype/form/${v}`);
      expect(container.querySelector(".prev-lane")).toBeTruthy();
      cleanup();
    }

    // B only reaches the scheduling step once the name is filled in.
    const { container } = at("#/prototype/form/B");
    fireEvent.change(container.querySelector(".input"), { target: { value: "Study" } });
    fireEvent.click([...container.querySelectorAll("button")].find((b) => /Next/.test(b.textContent)));
    expect(container.querySelector(".prev-lane")).toBeTruthy();
  });

  it("shows what is already on the day", () => {
    const { container } = at("#/prototype/form/A");
    const blocks = container.querySelectorAll(".prev-b");
    expect(blocks.length).toBeGreaterThan(2);
    expect(blocks[0].getAttribute("title")).toMatch(/—/);
  });

  it("draws the proposed block and says whether it fits", () => {
    const { container } = at("#/prototype/form/A");
    expect(container.querySelector(".prev-mine")).toBeTruthy();
    expect(container.querySelector(".prev-ok").textContent).toBe("Fits");
  });

  it("turns amber and names the clash when it collides", () => {
    const { container } = at("#/prototype/form/A");
    fireEvent.change(container.querySelector('input[aria-label="Time"]'), {
      target: { value: "6:30" },
    });
    expect(container.querySelector(".prev-warn")).toBeTruthy();
    expect(container.querySelector(".prev-mine.clash")).toBeTruthy();
    expect(container.querySelector(".prev-b.hit")).toBeTruthy();
    expect(container.querySelector(".prev-note").textContent).toMatch(/Overlaps/);
  });
});

describe("zoom is not only a button", () => {
  it("responds to ctrl+wheel", () => {
    const { container } = at("#/");
    const sc = container.querySelector(".tl-scroll");
    const before = parseFloat(container.querySelector(".tl-day").style.height);
    fireEvent.wheel(sc, { deltaY: -240, ctrlKey: true });
    expect(parseFloat(container.querySelector(".tl-day").style.height)).toBeGreaterThan(before);
  });

  it("zooms out on the other direction", () => {
    const { container } = at("#/");
    const sc = container.querySelector(".tl-scroll");
    const before = parseFloat(container.querySelector(".tl-day").style.height);
    fireEvent.wheel(sc, { deltaY: 240, ctrlKey: true });
    expect(parseFloat(container.querySelector(".tl-day").style.height)).toBeLessThan(before);
  });

  it("leaves a plain wheel alone — that is scrolling, not zooming", () => {
    const { container } = at("#/");
    const before = parseFloat(container.querySelector(".tl-day").style.height);
    fireEvent.wheel(container.querySelector(".tl-scroll"), { deltaY: -240 });
    expect(parseFloat(container.querySelector(".tl-day").style.height)).toBe(before);
  });

  it("responds to ctrl plus and minus", () => {
    const { container } = at("#/");
    const sc = container.querySelector(".tl-scroll");
    const h = () => parseFloat(container.querySelector(".tl-day").style.height);
    const start = h();
    fireEvent.keyDown(sc, { key: "+", ctrlKey: true });
    expect(h()).toBeGreaterThan(start);
    fireEvent.keyDown(sc, { key: "-", ctrlKey: true });
    expect(h()).toBeCloseTo(start, 0);
  });

  it("ctrl+0 returns to 100%", () => {
    const { container } = at("#/");
    const sc = container.querySelector(".tl-scroll");
    fireEvent.wheel(sc, { deltaY: -600, ctrlKey: true });
    expect(container.querySelector(".tl-zoom-l").textContent).not.toMatch(/^100%/);
    fireEvent.keyDown(sc, { key: "0", ctrlKey: true });
    expect(container.querySelector(".tl-zoom-l").textContent).toMatch(/^100%/);
  });

  it("the readout is also the reset", () => {
    const { container } = at("#/");
    fireEvent.click(container.querySelector('[aria-label="Zoom in"]'));
    expect(container.querySelector(".tl-zoom-l").textContent).not.toMatch(/^100%/);
    fireEvent.click(container.querySelector(".tl-zoom-l"));
    expect(container.querySelector(".tl-zoom-l").textContent).toMatch(/^100%/);
  });

  it("keeps the point under the cursor still", () => {
    const src = readFileSync("src/app/Timeline.jsx", "utf8");
    // Anchored zoom, or the day jumps somewhere else as you scale.
    expect(src).toMatch(/zoomAround/);
    expect(src).toMatch(/into \* next - anchorY/);
  });

  it("does not hijack the browser's own zoom outside the timeline", () => {
    const src = readFileSync("src/app/Timeline.jsx", "utf8");
    // Listeners are on the scroller, never on window or document.
    expect(src).not.toMatch(/window\.addEventListener\("wheel"/);
    expect(src).not.toMatch(/document\.addEventListener\("wheel"/);
  });
});

describe("the date box does not twitch", () => {
  it("is cut for the longest day name, not the current one", () => {
    expect(CSS).toMatch(/\.dh-text \{[^}]*width: 15ch/);
    expect(CSS).toMatch(/\.dh-text \{[^}]*flex-shrink: 0/);
    // Reserved height too, so a holiday line does not shove the clock.
    expect(CSS).toMatch(/\.dh-line \{[^}]*min-height/);
  });

  it("holds its width across every day of the week", () => {
    const seen = new Set();
    for (let i = 0; i < 7; i++) {
      const { container } = at(`#/day/${readNow().jdn + i}`);
      seen.add(container.querySelector(".dh-text").className);
      cleanup();
    }
    // Same element, same class, no per-day sizing hacks.
    expect(seen.size).toBe(1);
  });
});

describe("scrollbars are the app's own", () => {
  it("styles them once, for everything", () => {
    expect(CSS).toMatch(/::-webkit-scrollbar \{[^}]*width: 10px/);
    expect(CSS).toMatch(/::-webkit-scrollbar-thumb \{[^}]*background-clip: content-box/);
    expect(CSS).toMatch(/scrollbar-width: thin/);
  });

  it("keeps the page gutter stable so content does not jump", () => {
    expect(CSS).toMatch(/html \{[^}]*scrollbar-gutter: stable/);
  });
});

describe("prototype mode reaches the go-anywhere panel", () => {
  const enable = () => {
    const s = at("#/settings");
    fireEvent.click([...s.container.querySelectorAll(".pref")]
      .find((r) => /Prototype mode/.test(r.textContent))
      .querySelector('[role="switch"]'));
    cleanup();
  };

  it("lists every open question as soon as the panel opens", () => {
    enable();
    const { container } = at("#/");
    fireEvent.click(container.querySelector("button.go"));
    // No typing required.
    expect(document.querySelector(".go-field input").value).toBe("");
    const heads = [...document.querySelectorAll(".go-sec-h")].map((h) => h.textContent);
    expect(heads).toContain("Prototypes");
    const protos = [...document.querySelectorAll(".go-hit")]
      .filter((r) => /Prototype/.test(r.textContent));
    expect(protos.length).toBe(PROTOTYPES.length);
  });

  it("shows one entry per question, not one per variant, before you type", () => {
    enable();
    const { container } = at("#/");
    fireEvent.click(container.querySelector("button.go"));
    const labels = [...document.querySelectorAll(".go-hit .go-label")].map((l) => l.textContent);
    for (const p of PROTOTYPES) expect(labels).toContain(p.title);
  });

  it("still shows nothing of the sort with the mode off", () => {
    const { container } = at("#/");
    fireEvent.click(container.querySelector("button.go"));
    expect([...document.querySelectorAll(".go-hit")].some((r) => /Prototype/.test(r.textContent)))
      .toBe(false);
  });
});

/**
 * The clock re-renders the whole page once a second. Anything that grabs
 * focus on render therefore grabs it once a second, which is faster than
 * anyone types. These are the fields that sit inside a popup while the
 * clock is ticking behind them.
 */
describe("a field keeps the caret while the clock ticks", () => {
  beforeEach(() => { cleanup(); localStorage.clear(); });

  /*
   * Navigate by rewriting history rather than assigning location.hash:
   * jsdom dispatches hashchange asynchronously, so under fake timers the
   * assignment made by `at` lands *inside* the tick we are advancing and
   * closes the very popup under test. That is a property of the test
   * harness, not of the app.
   */
  const open = (hash) => {
    window.history.replaceState(null, "", hash);
    return render(<App />);
  };

  it("the new-category field is not interrupted mid-word", () => {
    vi.useFakeTimers();
    try {
      const { container } = open("#/blueprints");
      const mk = [...container.querySelectorAll("button")]
        .find((b) => b.getAttribute("aria-label") === "New category");
      fireEvent.click(mk);

      const input = document.querySelector(".pop input");
      input.focus();
      fireEvent.change(input, { target: { value: "Sch" } });

      act(() => { vi.advanceTimersByTime(5100); });

      const still = document.querySelector(".pop input");
      expect(still).toBe(input);
      expect(document.activeElement).toBe(still);
      expect(still.value).toBe("Sch");
    } finally {
      vi.useRealTimers();
    }
  });

  it("the go-anywhere field is not interrupted mid-word", () => {
    vi.useFakeTimers();
    try {
      const { container } = open("#/");
      fireEvent.click(container.querySelector("button.go"));
      const input = document.querySelector(".go-field input");
      input.focus();
      fireEvent.change(input, { target: { value: "lun" } });

      act(() => { vi.advanceTimersByTime(5100); });

      const still = document.querySelector(".go-field input");
      expect(still).toBe(input);
      expect(document.activeElement).toBe(still);
      expect(still.value).toBe("lun");
    } finally {
      vi.useRealTimers();
    }
  });

  it("the popup binds its listeners once, not once per tick", () => {
    const src = readFileSync("src/app/Popup.jsx", "utf8");
    // the focus call must live in an effect that never re-runs
    expect(src).toMatch(/useEffect\(\(\) => \{\s*ref\.current\?\.focus\(\);\s*\}, \[\]\);/);
    // and the close handler must be reached through a ref, not a dependency
    expect(src).toMatch(/closeRef\.current/);
    expect(src).not.toMatch(/\}, \[onClose\]\);/);
  });
});

/**
 * The calendar has two shapes and a switch. What it must not have is filler:
 * the lead-in of a month used to be padded with empty boxes that still drew a
 * hover target, which is what read as overlapping blank dates.
 */
describe("the calendar has no blank boxes", () => {
  beforeEach(() => { cleanup(); localStorage.clear(); });

  it("draws one cell per real day and nothing else", () => {
    // Sene 2018 starts on a Friday — five columns of lead-in under the old build
    const { container } = at("#/calendar/2018-12");
    const days = ecMonthDays(2018, 12);
    const cells = [...container.querySelectorAll(".cell")];
    expect(cells).toHaveLength(days.length);
    expect(container.querySelectorAll(".blank")).toHaveLength(0);
    // every cell is a real destination, none is an inert box
    expect(cells.every((c) => c.tagName === "A" && c.getAttribute("href"))).toBe(true);
  });

  it("starts the month under its own weekday, by placement not by padding", () => {
    const { container } = at("#/calendar/2018-12");
    const first = container.querySelector(".cell");
    const lead = ecMonthDays(2018, 12)[0].dow;
    expect(first.style.gridColumnStart).toBe(String(lead + 1));
  });

  it("keeps the seven columns unsquished in both shapes", () => {
    expect(CSS).toMatch(/\.cal-grid\s*\{[^}]*repeat\(7,\s*minmax\(0,\s*1fr\)\)/);
    expect(CSS).not.toMatch(/\.cell\.blank/);
  });

  it("has no blank cells in any month of the year", () => {
    for (let m = 1; m <= 13; m += 1) {
      cleanup();
      const { container } = at(`#/calendar/2018-${m}`);
      expect(container.querySelectorAll(".blank")).toHaveLength(0);
      expect(container.querySelectorAll(".cell")).toHaveLength(ecMonthDays(2018, m).length);
    }
  });
});

describe("the calendar's two views", () => {
  beforeEach(() => { cleanup(); localStorage.clear(); });

  it("offers exactly two, grid first", () => {
    const { container } = at("#/calendar");
    const tabs = [...container.querySelectorAll(".vt-btn")];
    expect(tabs.map((b) => b.textContent.trim())).toEqual(["Grid", "List"]);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(container.querySelector(".cal-grid")).not.toBeNull();
    expect(container.querySelector(".cal-list")).toBeNull();
  });

  it("switches to a row per day, with a preview beside it", () => {
    const { container } = at("#/calendar/2018-12");
    fireEvent.click([...container.querySelectorAll(".vt-btn")].find((b) => /List/.test(b.textContent)));
    expect(container.querySelector(".cal-grid")).toBeNull();
    const rows = [...container.querySelectorAll(".dayrow")];
    expect(rows).toHaveLength(ecMonthDays(2018, 12).length);
    expect(rows[0].querySelector(".dr-preview")).not.toBeNull();
    expect(rows[0].getAttribute("href")).toMatch(/^#\/day\/\d+$/);
  });

  it("remembers which view you chose", () => {
    const { container } = at("#/calendar");
    fireEvent.click([...container.querySelectorAll(".vt-btn")].find((b) => /List/.test(b.textContent)));
    expect(JSON.parse(localStorage.getItem("planner:settings")).calView).toBe("list");
    cleanup();
    const again = at("#/calendar");
    expect(again.container.querySelector(".cal-list")).not.toBeNull();
  });

  it("says nothing about colour yet", () => {
    // the rewrite is structural: no category colour is painted onto a day
    const src = readFileSync("src/app/App.jsx", "utf8");
    const list = src.slice(src.indexOf("function CalendarList"), src.indexOf("function CalendarPage"));
    expect(list).not.toMatch(/colorOf|background(Color)?:/);
  });
});

/**
 * Hydration is scheduled with everything else, but it takes no time. It was
 * being drawn as a pill on top of whatever it happened during, and — worse —
 * its slots were never moved onto the dawn axis the way task starts are, so
 * every sip sat six hours late. The last one landed at 2am, during sleep.
 */
describe("water is placed, and drawn as a line", () => {
  beforeEach(() => { cleanup(); localStorage.clear(); });

  it("puts no sip in the night", () => {
    const { container } = at("#/");
    const sips = [...container.querySelectorAll(".sip")];
    expect(sips.length).toBeGreaterThan(0);

    const sleep = DEFAULT_TASKS.find((t) => t.key === "sleep");
    const wake = DEFAULT_TASKS.find((t) => t.key === "wake");
    const water = DEFAULT_TASKS.find((t) => t.key === "water");
    // every slot lands between waking and going to sleep
    for (const at_ of water.slots) {
      expect(at_).toBeGreaterThanOrEqual(wake.startMin);
      expect(at_).toBeLessThan(sleep.startMin);
    }
  });

  it("lands each sip on the ruler at the time it is planned for", () => {
    const { container } = at("#/");
    const water = DEFAULT_TASKS.find((t) => t.key === "water");
    const labels = [...container.querySelectorAll(".sip")].map((s) => s.getAttribute("aria-label"));
    // the label states a clock time, and it is the planned one
    water.slots.forEach((min, i) => {
      expect(labels[i]).toContain(t12(min));
    });
  });

  it("does not collide with the meals it sits between", () => {
    const water = DEFAULT_TASKS.find((t) => t.key === "water");
    const meals = DEFAULT_TASKS.filter((t) => ["breakfast", "lunch", "dinner"].includes(t.key));
    for (const slot of water.slots) {
      for (const m of meals) {
        const inside = slot > m.startMin && slot < m.startMin + m.duration;
        expect(inside).toBe(false);
      }
    }
  });

  it("draws a rule across the ruler rather than a block", () => {
    const { container } = at("#/");
    const sip = container.querySelector(".sip");
    expect(sip.querySelector(".sip-rule")).not.toBeNull();
    expect(sip.querySelector(".sip-tag")).not.toBeNull();
    // no height of its own: a moment occupies no span of the day
    expect(CSS).toMatch(/\.sip \{[^}]*height: 14px/);
    expect(CSS).toMatch(/\.sip-rule \{[^}]*border-top/);
  });
});

/**
 * The day is one page and the page is the scroller. The header is the top of
 * that page, not a frame above a second scrollbar.
 */
describe("the day scrolls as one page", () => {
  beforeEach(() => { cleanup(); localStorage.clear(); });

  it("gives the timeline no scrollbar of its own", () => {
    const { container } = at("#/");
    expect(container.querySelector(".tl-scroll").style.height).toBeFalsy();
    expect(CSS).not.toMatch(/\.tl-scroll \{[^}]*overflow-y/);
    // and the day still lays out at its full height
    const px = 1.15;
    expect(container.querySelector(".tl-track").style.height).toBe(`${1440 * px}px`);
  });

  it("puts the header in the scrolling flow, above the timeline", () => {
    const { container } = at("#/");
    const top = container.querySelector(".day-top");
    const tl = container.querySelector(".tl-wrap");
    expect(top).not.toBeNull();
    // the header is a sibling before the timeline, not a fixed frame
    expect(top.compareDocumentPosition(tl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(CSS).not.toMatch(/\.day-top \{[^}]*position: fixed/);
  });

  it("leaves a minimal rail behind: the time, and what is now and next", () => {
    const { container } = at("#/");
    const rail = container.querySelector(".rail");
    expect(rail).not.toBeNull();
    // digital, and small
    expect(rail.querySelector(".rail-clock")).not.toBeNull();
    expect(rail.querySelector(".face")).toBeNull();      // no dial in the rail
    expect(CSS).toMatch(/\.rail-slot \{[^}]*position: sticky/);
  });

  it("shows only the current and the next few in the rail", () => {
    const { container } = at("#/");
    const shown = container.querySelectorAll(".rail-task");
    expect(shown.length).toBeLessThanOrEqual(3);
  });
});

describe("a day ends where the day ends", () => {
  beforeEach(() => { cleanup(); localStorage.clear(); });

  it("holds exactly one day in the scroller", () => {
    const { container } = at("#/");
    expect(container.querySelectorAll(".tl-day")).toHaveLength(1);
    expect(container.querySelectorAll(".tl-day.neighbour")).toHaveLength(0);
  });

  it("crosses a day only on purpose, up for back and down for forward", () => {
    const jdn = readNow().jdn;
    const { container } = at("#/");
    const prev = container.querySelector("a.tl-div-prev");
    const next = container.querySelector("a.tl-div-next");
    expect(prev.getAttribute("href")).toBe(`#/day/${jdn - 1}`);
    expect(next.getAttribute("href")).toBe(`#/day/${jdn + 1}`);
    // and they are not inside the scrolling area
    expect(prev.closest(".tl-scroll")).toBeNull();
    expect(next.closest(".tl-scroll")).toBeNull();
  });
});

/**
 * Blueprints is where the plan is shaped. The day page is where doing it is
 * recorded. Those are different jobs and the task rows used to lead to the
 * wrong one.
 */
describe("a blueprint row edits the task, it does not log it", () => {
  beforeEach(() => { cleanup(); localStorage.clear(); });

  const openFirstRow = () => {
    const r = at("#/blueprints");
    const row = r.container.querySelector(".trow");
    fireEvent.click(row);
    return r;
  };

  it("does not navigate to the day's logging page", () => {
    const { container } = at("#/blueprints");
    const rows = [...container.querySelectorAll(".trow")];
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.tagName).toBe("BUTTON");
      expect(row.getAttribute("href")).toBeNull();
    }
  });

  it("opens editing, with the shape of the plan in it", () => {
    openFirstRow();
    expect(document.querySelector(".pop-title").textContent).toMatch(/^Edit /);
    const ids = [...document.querySelectorAll(".pop .input")].map((i) => i.id);
    // name, description, start, duration, place, frequency
    expect(ids).toEqual(expect.arrayContaining(["et", "ed", "es", "em", "ep", "ef"]));
  });

  it("carries no logging controls", () => {
    openFirstRow();
    const text = document.querySelector(".pop").textContent;
    // nothing here records *doing* the task — that lives on the day page
    expect(text).not.toMatch(/Mark done|Mark as done|Log it|Completed|Not done/i);
    expect(document.querySelector(".pop .tally")).toBeNull();
  });

  it("saves a change to the plan", () => {
    openFirstRow();
    const name = document.querySelector("#et");
    fireEvent.change(name, { target: { value: "Renamed task" } });
    fireEvent.click([...document.querySelectorAll(".btn")].find((b) => b.textContent === "Save"));
    expect(document.querySelector(".pop")).toBeNull();
    expect(document.body.textContent).toContain("Renamed task");
  });

  it("offers deletion, behind a confirmation", () => {
    openFirstRow();
    const del = document.querySelector(".btn.danger");
    expect(del).not.toBeNull();
    fireEvent.click(del);
    // asks first
    expect(document.body.textContent).toMatch(/Turn off|Delete/);
    expect(document.querySelectorAll(".pop").length).toBeGreaterThan(1);
  });

  it("blocks a single date without changing the pattern", () => {
    const jdn = readNow().jdn;
    const { container } = at("#/blueprints");
    // a repeating task
    const rows = [...container.querySelectorAll(".trow")];
    const row = rows.find((r) => /Every day/i.test(r.textContent)) ?? rows[0];
    const pattern = row.querySelector(".tc-pat").textContent;
    fireEvent.click(row);

    fireEvent.click([...document.querySelectorAll(".btn")].find((b) => /Block a date/.test(b.textContent)));
    const today = [...document.querySelectorAll(".mini-day")].find((d) => d.className.includes("today"));
    fireEvent.click(today);

    // recorded as an exception, visible and reversible
    const chips = [...document.querySelectorAll(".block-chip")];
    expect(chips.length).toBe(1);
    // the rule itself is untouched
    expect(document.querySelector(".pop-sub").textContent).toBe(pattern);
  });

  it("keeps a blocked day off that day only", () => {
    const jdn = readNow().jdn;
    const iso = dayFromJdn(jdn).iso ?? null;
    const { container } = at("#/blueprints");
    const rows = [...container.querySelectorAll(".trow")];
    const row = rows.find((r) => /Every day/i.test(r.textContent)) ?? rows[0];
    const title = row.querySelector(".tc-name").textContent.replace("default", "").trim();
    fireEvent.click(row);
    fireEvent.click([...document.querySelectorAll(".btn")].find((b) => /Block a date/.test(b.textContent)));
    fireEvent.click([...document.querySelectorAll(".mini-day")].find((d) => d.className.includes("today")));
    fireEvent.click([...document.querySelectorAll(".btn")].find((b) => b.textContent === "Save"));

    cleanup();
    // gone from today
    const todayPage = at("#/");
    expect(todayPage.container.querySelector(".day-split")?.textContent ?? "").not.toContain(title);
    cleanup();
    // still there tomorrow
    const tomorrow = at(`#/day/${jdn + 1}`);
    expect(tomorrow.container.textContent).toContain(title);
  });
});

/**
 * The app is being handed to people who are not building it. It has to say
 * where feedback goes, and carry enough state in the report that a stranger's
 * bug is reproducible.
 */
describe("feedback has somewhere to go", () => {
  beforeEach(() => { cleanup(); localStorage.clear(); });

  it("offers a way to report from inside the app", () => {
    const { container } = at("#/settings");
    const report = [...container.querySelectorAll("a.row")]
      .find((a) => /Report something/.test(a.textContent));
    expect(report).not.toBeNull();
    expect(report.getAttribute("href")).toMatch(/github\.com\/.+\/issues\/new/);
    // opens away from the app rather than losing what you were doing
    expect(report.getAttribute("target")).toBe("_blank");
    expect(report.getAttribute("rel")).toMatch(/noreferrer/);
  });

  it("prefills the details nobody remembers to include", () => {
    const { container } = at("#/settings");
    const href = [...container.querySelectorAll("a.row")]
      .find((a) => /Report something/.test(a.textContent)).getAttribute("href");
    const body = decodeURIComponent(href);
    expect(body).toContain("What happened");
    expect(body).toContain("What you expected instead");
    expect(body).toContain("Build:");
    expect(body).toContain("Browser:");
  });

  it("reports counts, never the content of anyone's plans", () => {
    const { container } = at("#/settings");
    const href = [...container.querySelectorAll("a.row")]
      .find((a) => /Report something/.test(a.textContent)).getAttribute("href");
    const body = decodeURIComponent(href);
    // the built-in task titles must not be carried into a public issue
    for (const t of DEFAULT_TASKS) expect(body).not.toContain(t.title);
    expect(body).toMatch(/Tasks: \d+/);
  });

  it("says plainly that nothing leaves the browser", () => {
    const { container } = at("#/settings");
    expect(container.textContent).toMatch(/stay in this browser|Nothing is uploaded/i);
  });
});
