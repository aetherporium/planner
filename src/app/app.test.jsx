// @vitest-environment jsdom
/**
 * Smoke tests: every route renders, and the product rules the brief insists on
 * are actually enforced in the UI, not just in the pure modules.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import App from "./App.jsx";
import { parseHash } from "./hooks.js";
import { readNow, ruleIdOf, ruleById } from "./store.js";
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
    expect(parseHash("#/blueprints")).toEqual({ name: "blueprints" });
    expect(parseHash("#/blueprint/everyday")).toEqual({ name: "blueprint", id: "everyday" });
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

  it("today sits inside the calendar branch, so you can navigate up", () => {
    const { container } = at("#/");
    const crumbs = container.querySelector(".crumbs");
    // Calendar is an ancestor link, not a sibling — today is not the trunk.
    expect(within(crumbs).getByText("Calendar").getAttribute("href")).toBe("#/calendar");
  });

  it("calendar renders both calendars in one grid", () => {
    const { container } = at("#/calendar");
    const cells = container.querySelectorAll("a.cell");
    expect(cells.length).toBeGreaterThan(27);
    const first = cells[0];
    expect(first.querySelector(".ec")).toBeTruthy(); // Ethiopian
    expect(first.querySelector(".gc")).toBeTruthy(); // Gregorian
  });

  it("blueprint index lists every rule as its own page link", () => {
    const { container } = at("#/blueprints");
    const links = [...container.querySelectorAll('a[href^="#/blueprint/"]')];
    expect(links.length).toBe(9);
  });

  it("a blueprint page renders its own tasks", () => {
    at("#/blueprint/everyday");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Every day");
    expect(screen.getByText("Breakfast")).toBeTruthy();
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
    cleanup();
    at("#/blueprint/nope");
    expect(screen.getByText(/does not exist/)).toBeTruthy();
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
    for (const hash of ["#/", "#/calendar", "#/blueprints", "#/blueprint/everyday"]) {
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
    for (const hash of ["#/", "#/calendar", "#/blueprints", "#/blueprint/everyday"]) {
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
    for (const hash of ["#/", "#/calendar", "#/blueprints", "#/blueprint/everyday"]) {
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
    // The clock belongs to the header.
    expect(container.querySelector("header .clock")).toBeTruthy();
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

  it("puts the five defaults on the everyday blueprint", () => {
    at("#/blueprint/everyday");
    for (const t of ["Wake", "Breakfast", "Lunch", "Dinner", "Sleep"]) {
      expect(screen.getByText(t)).toBeTruthy();
    }
  });

  it("marks which blueprints apply to today", () => {
    const today = dayFromJdn(readNow().jdn);
    const { container } = at("#/blueprints");
    const rows = [...container.querySelectorAll("a.row")];
    const everyday = rows.find((r) => /Every day/.test(r.textContent));
    expect(everyday.textContent).toMatch(/applies today/);
    const other = rows.find((r) =>
      today.isWeekend ? /Every weekday/.test(r.textContent) : /Every weekend/.test(r.textContent),
    );
    expect(other.textContent).not.toMatch(/applies today/);
  });
});
