// @vitest-environment jsdom
/**
 * Smoke tests: every route renders, and the product rules the brief insists on
 * are actually enforced in the UI, not just in the pure modules.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within, fireEvent } from "@testing-library/react";
import App from "./App.jsx";
import { parseHash } from "./hooks.js";
import { readNow, ruleIdOf, ruleById } from "./store.js";
import { t12, parts12 } from "./format.js";
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
    expect(parseHash("#/prototype/B")).toEqual({ name: "prototype", variant: "B" });
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

  it("add page renders and hides detail behind a disclosure", () => {
    const { container } = at(`#/day/${readNow().jdn}/add`);
    expect(screen.getByLabelText("What")).toBeTruthy();
    expect(screen.getByLabelText("Starts")).toBeTruthy();
    // Repeats/place/kind live inside <details>, so adding stays minimal.
    const details = container.querySelector("details.disclosure");
    expect(details).toBeTruthy();
    expect(details.open).toBe(false);
    expect(within(details).getByLabelText("Repeats")).toBeTruthy();
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
    expect(container.querySelector("header.dayhead")).toBeTruthy();
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
    // The blueprint index is pure English.
    expect(container.querySelector(".rows").textContent).not.toMatch(ethiopic);
    cleanup();

    const cal = at("#/calendar").container;
    // Every Ethiopic string in the calendar is inside an .am element.
    for (const node of cal.querySelectorAll("*")) {
      if (node.children.length === 0 && ethiopic.test(node.textContent)) {
        expect(node.closest(".am")).toBeTruthy();
      }
    }
  });

  it("renders the clock in analog and digital form at once", () => {
    const { container } = at("#/");
    expect(container.querySelector("svg.clock-face")).toBeTruthy();
    expect(container.querySelector(".clock-time").textContent).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it("has no floating clock pill and no quick-add on the day", () => {
    const { container } = at("#/");
    expect(container.querySelector(".pill, .fab, .quickadd")).toBeNull();
    expect(container.querySelector("header .clock")).toBeTruthy();
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

  it("puts a large analog clock at the top left of the day", () => {
    const { container } = at("#/");
    const head = container.querySelector("header.dayhead");
    // The clock is the first thing in the header.
    expect(head.firstElementChild.classList.contains("clock")).toBe(true);
    const face = head.querySelector("svg.clock-face");
    expect(Number(face.getAttribute("width"))).toBeGreaterThanOrEqual(72);
  });
});

describe("the 24-hour timeline", () => {
  const px = 1.15;

  it("covers a full 24 hours and scrolls", () => {
    const { container } = at("#/");
    const canvas = container.querySelector(".tl-canvas");
    expect(canvas.style.height).toBe(`${1440 * px}px`);
    expect(container.querySelectorAll(".tl-hour").length).toBe(25);
    expect(container.querySelector(".tl-scroll").style.height).toBeTruthy();
  });

  it("gives every entry a height equal to its duration", () => {
    const { container } = at("#/");
    const byTitle = {};
    for (const ev of container.querySelectorAll("a.ev")) {
      byTitle[ev.querySelector(".ev-title").textContent] = ev;
    }
    // Wake 5m, Breakfast 30m, Lunch 45m, Sleep 450m.
    const h = (t) => parseFloat(byTitle[t].style.height);
    const top = (t) => parseFloat(byTitle[t].style.top);

    expect(h("Breakfast")).toBeCloseTo(30 * px - 3, 1);
    expect(h("Lunch")).toBeCloseTo(45 * px - 3, 1);
    expect(h("Sleep")).toBeCloseTo(450 * px - 3, 1);
    // Lunch really is 1.5x breakfast on screen.
    expect(h("Lunch") / h("Breakfast")).toBeGreaterThan(1.4);
    // Wake is tiny but still clickable.
    expect(h("Wake")).toBeGreaterThanOrEqual(16);

    // Position is start time.
    expect(top("Breakfast")).toBeCloseTo(7 * 60 * px, 1);
    expect(top("Lunch")).toBeCloseTo((12 * 60 + 30) * px, 1);
  });

  it("draws a fill that ends at the current minute", () => {
    const { container } = at("#/");
    const fill = container.querySelector(".tl-fill");
    expect(fill).toBeTruthy();
    expect(parseFloat(fill.style.height)).toBeCloseTo(readNow().minutes * px, 0);
    // and the marker sits at the same place
    expect(parseFloat(container.querySelector(".tl-nowdot").style.top)).toBeCloseTo(
      readNow().minutes * px,
      0,
    );
  });

  it("has no fill or now-marker on a day that is not today", () => {
    const { container } = at(`#/day/${readNow().jdn + 2}`);
    expect(container.querySelector(".tl-fill")).toBeNull();
    expect(container.querySelector(".tl-nowdot")).toBeNull();
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
    const pats = [...container.querySelectorAll(".pat")];
    // The five defaults are all daily, so exactly one pattern exists.
    expect(pats).toHaveLength(1);
    expect(pats[0].textContent).toMatch(/Daily/);
    // No empty weekday/weekend shelves invented for us.
    expect(container.textContent).not.toMatch(/Weekends/);
    expect(container.textContent).not.toMatch(/Holidays/);
  });

  it("never writes 'every' on a pattern", () => {
    const { container } = at("#/blueprints");
    for (const p of container.querySelectorAll(".pat")) {
      expect(p.textContent).not.toMatch(/every/i);
    }
  });

  it("opens the first pattern and lists its tasks", () => {
    const { container } = at("#/blueprints");
    expect(container.querySelector(".pat.on")).toBeTruthy();
    for (const t of ["Wake", "Breakfast", "Lunch", "Dinner", "Sleep"]) {
      expect(screen.getByText(t)).toBeTruthy();
    }
  });

  it("offers categories as a separate, authored grouping", () => {
    const { container } = at("#/blueprints");
    expect(container.textContent).toMatch(/Categories/);
    expect(container.textContent).toMatch(/No categories yet/);
  });
});


describe("12-hour time starting at 12 in the morning", () => {
  it("reads midnight as 12 and noon as 12", () => {
    expect(t12(0)).toBe("12:00");
    expect(t12(720)).toBe("12:00");
    expect(parts12(0).pm).toBe(false);
    expect(parts12(720).pm).toBe(true);
  });

  it("never runs past 12", () => {
    for (let m = 0; m < 1440; m += 7) {
      const p = parts12(m);
      expect(p.h).toBeGreaterThanOrEqual(1);
      expect(p.h).toBeLessThanOrEqual(12);
    }
  });

  it("uses no am/pm letters anywhere in the UI", () => {
    for (const hash of ["#/", "#/blueprints", `#/task/default:lunch/${readNow().jdn}`]) {
      const { container } = at(hash);
      expect(container.textContent).not.toMatch(/\b(am|pm|AM|PM|a\.m\.|p\.m\.)\b/);
      cleanup();
    }
  });

  it("marks morning and afternoon visually instead", () => {
    const { container } = at("#/");
    const marks = container.querySelectorAll('[role="img"][aria-label="morning"], [role="img"][aria-label="afternoon"]');
    expect(marks.length).toBeGreaterThan(4);
  });

  it("labels the timeline ruler 12, 1, 2 … not 13, 14", () => {
    const { container } = at("#/");
    const labs = [...container.querySelectorAll(".tl-hour .lab")].map((l) =>
      Number(l.textContent.trim()),
    );
    expect(labs[0]).toBe(12);
    expect(labs[13]).toBe(1);
    expect(Math.max(...labs)).toBe(12);
  });

  it("shows the clock in 12-hour form with a mark", () => {
    const { container } = at("#/");
    const digits = container.querySelector(".clock-time");
    expect(digits.textContent).toMatch(/^\d{1,2}:\d{2}:\d{2}$/);
    expect(digits.querySelector('[role="img"]')).toBeTruthy();
  });
});

describe("categories", () => {
  it("a user can create one, colour it, and see their tasks in it", () => {
    const { container } = at("#/blueprints");

    fireEvent.click(
      [...container.querySelectorAll("button")].find((b) => /New category/.test(b.textContent)),
    );
    fireEvent.change(container.querySelector("#cn"), { target: { value: "School" } });
    // Pick a colour other than the default.
    fireEvent.click(container.querySelectorAll(".swatches .swatch")[2]);
    fireEvent.click(
      [...container.querySelectorAll("button")].find((b) => /Create/.test(b.textContent)),
    );

    const cat = container.querySelector(".cat");
    expect(cat.textContent).toMatch(/School/);
    expect(cat.style.getPropertyValue("--h")).toBe("268"); // violet
    expect(cat.textContent).toMatch(/Nothing here yet/);
    expect(JSON.parse(localStorage.getItem("planner:categories"))[0].name).toBe("School");
  });

  it("deleting a category releases its tasks instead of deleting them", () => {
    const { container } = at("#/blueprints");
    fireEvent.click(
      [...container.querySelectorAll("button")].find((b) => /New category/.test(b.textContent)),
    );
    fireEvent.change(container.querySelector("#cn"), { target: { value: "Home" } });
    fireEvent.click(
      [...container.querySelectorAll("button")].find((b) => /Create/.test(b.textContent)),
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
    expect(bp.container.querySelector(".cat").textContent).toMatch(/Lunch/);
    fireEvent.click(bp.container.querySelector('[aria-label="Delete Home"]'));

    // The category is gone; Lunch is not.
    expect(bp.container.querySelector(".cat")).toBeNull();
    expect(bp.container.textContent).toMatch(/Lunch/);
    expect(JSON.parse(localStorage.getItem("planner:categories"))).toEqual([]);
  });

  it("starts with none — nothing is invented", () => {
    at("#/blueprints");
    expect(JSON.parse(localStorage.getItem("planner:categories") ?? "[]")).toEqual([]);
  });
});

describe("the navigation prototype", () => {
  it("renders all three variants and is marked throwaway", () => {
    for (const v of ["A", "B", "C"]) {
      const { container } = at(`#/prototype/${v}`);
      expect(container.querySelector(".proto-tag").textContent).toMatch(/throwaway/i);
      expect(container.querySelector(".switcher")).toBeTruthy();
      cleanup();
    }
  });

  it("variants are structurally different, not reskins", () => {
    const a = at("#/prototype/A").container;
    expect(a.querySelector(".adj")).toBeTruthy();
    expect(a.querySelector(".summon")).toBeNull();
    expect(a.querySelector(".orbit")).toBeNull();
    cleanup();

    const b = at("#/prototype/B").container;
    expect(b.querySelector(".summon")).toBeTruthy();
    expect(b.querySelector(".adj")).toBeNull();
    cleanup();

    const c = at("#/prototype/C").container;
    expect(c.querySelector(".orbit")).toBeTruthy();
    expect(c.querySelectorAll(".spoke")).toHaveLength(3);
  });

  it("the switcher cycles and wraps", () => {
    const { container } = at("#/prototype/A");
    const arrows = container.querySelectorAll(".sw-arrow");
    expect(arrows[0].getAttribute("href")).toBe("#/prototype/C");
    expect(arrows[1].getAttribute("href")).toBe("#/prototype/B");
  });

  it("falls back to A on a bad variant", () => {
    const { container } = at("#/prototype/Z");
    expect(container.querySelector(".adj")).toBeTruthy();
  });
});
