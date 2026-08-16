// @vitest-environment jsdom
/**
 * Smoke tests: every route renders, and the product rules the brief insists on
 * are actually enforced in the UI, not just in the pure modules.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";

const CSS = readFileSync("src/app/styles.css", "utf8");
import App from "./App.jsx";
import { parseHash } from "./hooks.js";
import { readNow, ruleIdOf, ruleById } from "./store.js";
import { t12, parts, fromDawn, parseEth, DAWN } from "./format.js";
import { dayFromJdn } from "../calendar.mjs";

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
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Today");
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
    const add = container.querySelector('a[href$="/add"]');
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
    expect(container.querySelector(".dh-read").textContent).toMatch(/^\d{1,2}:\d{2}:\d{2}$/);
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
    const t = container.querySelector(".top-theme");
    expect(t).toBeTruthy();
    expect(t.textContent.trim()).toBe("");
    expect(t.querySelector("svg")).toBeTruthy();
  });

  it("carries the same theme control on every page", () => {
    for (const hash of ["#/", "#/calendar", "#/blueprints", `#/day/${readNow().jdn}/add`]) {
      const { container } = at(hash);
      expect(container.querySelector(".top-theme")).toBeTruthy();
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
    const nums = [...face.querySelectorAll("text")].map((t) => t.textContent);
    expect(nums).toHaveLength(12);
    expect(nums).toContain("12");
    // A circle, not a square: no rect, and the only outline is a circle.
    expect(face.querySelector("rect")).toBeNull();
    expect(face.querySelector("circle")).toBeTruthy();
    // No card around it either.
    expect(head.classList.contains("glass")).toBe(false);
  });

  it("puts the digits outside the dial where they can be read", () => {
    const { container } = at("#/");
    const face = container.querySelector("svg.face");
    // Nothing bent around an arc inside the face.
    expect(face.querySelector("textPath")).toBeNull();
    const read = container.querySelector(".dh-read");
    expect(read).toBeTruthy();
    // Upright, outside the svg, and above it in the DOM.
    expect(read.closest("svg")).toBeNull();
    expect(read.compareDocumentPosition(face) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps the clock modest in size", () => {
    const { container } = at("#/");
    const w = Number(container.querySelector("svg.face").getAttribute("width"));
    expect(w).toBeGreaterThan(100);
    expect(w).toBeLessThanOrEqual(120);
  });

  it("shows the day/night mark beside the digits", () => {
    const { container } = at("#/");
    const mark = container.querySelector('.dh-read [role="img"]');
    expect(["day", "night"]).toContain(mark.getAttribute("aria-label"));
  });
});

describe("the 24-hour timeline", () => {
  const px = 1.15;

  it("covers a full 24 hours per day and scrolls vertically only", () => {
    const { container } = at("#/");
    const cur = container.querySelector(".tl-day.current");
    expect(cur.style.height).toBe(`${1440 * px}px`);
    expect(cur.querySelectorAll(".tl-hour").length).toBe(25);
    const sc = container.querySelector(".tl-scroll");
    expect(sc.style.height).toBeTruthy();
    // No sideways scrolling.
    expect(CSS).toMatch(/\.tl-scroll \{[^}]*overflow-x: hidden/);
  });

  it("holds yesterday, today and tomorrow in one timeline", () => {
    const jdn = readNow().jdn;
    const { container } = at("#/");
    const days = container.querySelectorAll(".tl-day");
    expect(days).toHaveLength(3);
    expect(container.querySelectorAll(".tl-day.current")).toHaveLength(1);
    expect(container.querySelectorAll(".tl-day.neighbour")).toHaveLength(2);
    // Dividers link to the neighbouring days.
    const divs = [...container.querySelectorAll("a.tl-div")].map((a) => a.getAttribute("href"));
    expect(divs).toContain(`#/day/${jdn + 1}`);
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

  it("leads with adding a task", () => {
    const { container } = at("#/blueprints");
    const add = container.querySelector("a.bp-add");
    expect(add.getAttribute("href")).toMatch(/\/add$/);
    expect(add.textContent).toMatch(/New task/);
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
    const labs = [...container.querySelectorAll(".tl-hour .lab")].map((l) =>
      Number(l.textContent.trim()),
    );
    expect(labs[0]).toBe(12);   // dawn
    expect(labs[1]).toBe(1);
    expect(labs[12]).toBe(12);  // dusk
    expect(Math.max(...labs)).toBe(12);
  });

  it("shows the clock in Ethiopian form with a mark", () => {
    const { container } = at("#/");
    expect(container.querySelector(".dh-read").textContent).toMatch(/^\d{1,2}:\d{2}:\d{2}$/);
    expect(container.querySelector('.dh-read [role="img"]')).toBeTruthy();
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
    expect(foot).toEqual(["#/", "#/calendar", "#/blueprints"]);
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

  it("keeps the neighbouring days inside the same timeline", () => {
    const jdn = readNow().jdn;
    const { container } = at("#/");
    // Not separate rails outside the scroller any more.
    expect(container.querySelector(".adj")).toBeNull();
    const days = [...container.querySelectorAll(".tl-day")];
    expect(days).toHaveLength(3);
    // All three live inside the one scroller.
    for (const d of days) expect(d.closest(".tl-scroll")).toBeTruthy();
    expect([...container.querySelectorAll("a.tl-div")].map((a) => a.getAttribute("href")))
      .toContain(`#/day/${jdn + 1}`);
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
    expect(pop.querySelectorAll(".sched .slot").length).toBe(5);
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
    expect(names).toEqual(["Wake", "Breakfast", "Lunch", "Dinner", "Sleep"]);
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
    expect(container.querySelectorAll(".trow").length).toBe(5);
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

  it("centres the strips", () => {
    expect(CSS).toMatch(/\.card-strip\.centered \{[^}]*justify-content: safe center/);
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
  it("arms a confirmation instead of switching on scroll", () => {
    const { container } = at("#/");
    // Nothing armed until you scroll well past the edge.
    expect(container.querySelector(".tl-jump")).toBeNull();
    const sc = container.querySelector(".tl-scroll");
    expect(sc).toBeTruthy();
    // The threshold is deliberately far into the neighbour.
    const src = readFileSync("src/app/Timeline.jsx", "utf8");
    expect(src).toMatch(/DAY_H \* 0\.75/);
    expect(src).toMatch(/setArmed/);
    // And it never sets the hash from the scroll handler.
    expect(src).not.toMatch(/onScroll[\s\S]{0,400}window\.location\.hash =/);
  });

  it("puts the now strip beside the day, not above it", () => {
    const { container } = at("#/");
    const split = container.querySelector(".day-split");
    expect(split).toBeTruthy();
    expect(split.querySelector(".tl-wrap")).toBeTruthy();
    expect(split.querySelector(".ns")).toBeTruthy();
    expect(CSS).toMatch(/\.day-split \{[^}]*display: flex/);
  });
});

describe("the task-form prototype", () => {
  it("renders three structurally different variants", () => {
    const a = at("#/prototype/A").container;
    expect(a.querySelectorAll(".section").length).toBeGreaterThan(2); // grouped ladder
    expect(a.querySelector(".steps")).toBeNull();
    cleanup();

    const b = at("#/prototype/B").container;
    expect(b.querySelectorAll(".step").length).toBe(3);
    cleanup();

    const c = at("#/prototype/C").container;
    expect(c.querySelector(".sentence")).toBeTruthy();
    expect(c.querySelectorAll(".blank").length).toBeGreaterThan(3);
  });

  it("every variant treats frequency as required", () => {
    for (const v of ["A", "B", "C"]) {
      const { container } = at(`#/prototype/${v}`);
      expect(container.textContent).toMatch(/how often|required/i);
      expect(container.querySelector(".req")).toBeTruthy();
      cleanup();
    }
  });

  it("no variant can be submitted without a frequency", () => {
    for (const v of ["A", "C"]) {
      const { container } = at(`#/prototype/${v}`);
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
      const { container } = at(`#/prototype/${v}`);
      expect(container.querySelector("textarea")).toBeTruthy();
      cleanup();
    }
  });

  it("is marked throwaway and can get back", () => {
    const { container } = at("#/prototype/A");
    expect(container.querySelector(".proto-tag").textContent).toMatch(/throwaway/i);
    expect(container.querySelector('a[href="#/settings"]')).toBeTruthy();
    expect(container.querySelector(".switcher")).toBeTruthy();
  });
});
