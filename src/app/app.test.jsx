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
    expect(container.querySelector("svg.clock-face")).toBeTruthy();
    expect(container.querySelector(".clock-time").textContent).toMatch(/^\d{1,2}:\d{2}:\d{2}$/);
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

    // Position is measured from dawn, because the day begins at dawn.
    expect(top("Wake")).toBeCloseTo(0, 1);                       // 06:00 = hour 0
    expect(top("Breakfast")).toBeCloseTo(60 * px, 1);            // 07:00 = 1h in
    expect(top("Lunch")).toBeCloseTo((6 * 60 + 30) * px, 1);     // 12:30 = 6.5h in
  });

  it("draws a fill that ends at the current minute", () => {
    const { container } = at("#/");
    const fill = container.querySelector(".tl-fill");
    expect(fill).toBeTruthy();
    const elapsed = fromDawn(readNow().minutes) * px;
    expect(parseFloat(fill.style.height)).toBeCloseTo(elapsed, 0);
    // and the marker sits at the same place
    expect(parseFloat(container.querySelector(".tl-nowdot").style.top)).toBeCloseTo(elapsed, 0);
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
    const digits = container.querySelector(".clock-time");
    expect(digits.textContent).toMatch(/^\d{1,2}:\d{2}:\d{2}$/);
    expect(digits.querySelector('[role="img"]')).toBeTruthy();
  });

  it("fits sleep inside the day instead of overflowing it", () => {
    const { container } = at("#/");
    const sleep = [...container.querySelectorAll("a.ev")].find((e) =>
      /Sleep/.test(e.textContent),
    );
    const top = parseFloat(sleep.style.top);
    const height = parseFloat(sleep.style.height);
    const canvas = parseFloat(container.querySelector(".tl-canvas").style.height);
    // 22:30 is 16.5h after dawn; +450min lands exactly on the end of the day.
    expect(top).toBeCloseTo(16.5 * 60 * 1.15, 0);
    expect(top + height).toBeLessThanOrEqual(canvas + 1);
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
    expect(JSON.parse(localStorage.getItem("planner:categories"))[0].name).toBe("School");

    // Collapsed by default; expanding happens in place, not on a new page.
    expect(cat.querySelector(".sched")).toBeNull();
    expect(cat.classList.contains("open")).toBe(false);
    fireEvent.click(cat.querySelector(".cat-toggle"));
    const after = container.querySelector(".cat");
    expect(after.classList.contains("open")).toBe(true);
    expect(after.textContent).toMatch(/Nothing here yet/);
    // Still the same page — no navigation happened.
    expect(window.location.hash).toBe("#/blueprints");
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
    fireEvent.click(bp.container.querySelector(".cat-toggle"));
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

describe("every page is reachable", () => {
  it("the orbit anchor is present on every page", () => {
    for (const hash of ["#/", "#/calendar", "#/blueprints", `#/day/${readNow().jdn}/add`]) {
      const { container } = at(hash);
      expect(container.querySelector(".orbit .anchor")).toBeTruthy();
      cleanup();
    }
  });

  it("opens to three real links covering the whole app", () => {
    const { container } = at("#/");
    fireEvent.click(container.querySelector(".anchor"));
    const spokes = [...container.querySelectorAll("a.spoke")];
    expect(spokes.map((s) => s.getAttribute("href"))).toEqual([
      "#/",
      "#/calendar",
      "#/blueprints",
    ]);
    // They are anchors, so back/forward keeps working.
    for (const s of spokes) expect(s.tagName).toBe("A");
  });

  it("marks where you already are", () => {
    const { container } = at("#/calendar");
    fireEvent.click(container.querySelector(".anchor"));
    const current = container.querySelector("a.spoke.current");
    expect(current.getAttribute("href")).toBe("#/calendar");
  });

  it("keeps the spokes out of the tab order while closed", () => {
    const { container } = at("#/");
    for (const s of container.querySelectorAll("a.spoke")) {
      expect(s.getAttribute("tabindex")).toBe("-1");
    }
    fireEvent.click(container.querySelector(".anchor"));
    for (const s of container.querySelectorAll("a.spoke")) {
      expect(s.getAttribute("tabindex")).toBe("0");
    }
  });

  it("links to the navigation prototype from blueprints", () => {
    const { container } = at("#/blueprints");
    const link = container.querySelector('a[href^="#/prototype"]');
    expect(link).toBeTruthy();
    expect(link.textContent).toMatch(/prototype/i);
  });

  it("every prototype variant can get back to the app", () => {
    for (const v of ["A", "B", "C"]) {
      const { container } = at(`#/prototype/${v}`);
      expect(container.querySelector('a[href="#/blueprints"]')).toBeTruthy();
      cleanup();
    }
  });

  it("reaches the add page and the task page from the day", () => {
    const jdn = readNow().jdn;
    const { container } = at(`#/day/${jdn}`);
    // Every planned task links to its own detail page.
    const task = container.querySelector('a.ev[href^="#/task/"]');
    expect(task).toBeTruthy();
    cleanup();
    // And the add page is reachable by route.
    expect(at(`#/day/${jdn}/add`).container.querySelector("#t")).toBeTruthy();
  });
});

describe("blueprints do not look like the day page", () => {
  it("uses a schedule strip, not a timeline", () => {
    const { container } = at("#/blueprints");
    // No 24-hour canvas, no hour ruler, no now-marker.
    expect(container.querySelector(".tl-canvas")).toBeNull();
    expect(container.querySelector(".tl-hour")).toBeNull();
    expect(container.querySelector(".tl-nowdot")).toBeNull();
    // Its own vocabulary instead.
    expect(container.querySelectorAll(".sched .slot").length).toBe(5);
  });

  it("expands a pattern in place rather than navigating", () => {
    const { container } = at("#/blueprints");
    expect(container.querySelector(".pat-open")).toBeTruthy();
    fireEvent.click(container.querySelector(".pat"));
    expect(container.querySelector(".pat-open")).toBeNull();
    expect(window.location.hash).toBe("#/blueprints");
  });

  it("sizes each slot bar by duration", () => {
    const { container } = at("#/blueprints");
    const bars = [...container.querySelectorAll(".slot")].map((s) => ({
      name: s.querySelector(".slot-n").textContent,
      w: Number(s.querySelector(".slot-bar").style.getPropertyValue("--w")),
    }));
    const by = Object.fromEntries(bars.map((b) => [b.name, b.w]));
    expect(by.Sleep).toBeGreaterThan(by.Lunch);
    expect(by.Lunch).toBeGreaterThan(by.Breakfast);
    expect(by.Breakfast).toBeGreaterThan(by.Wake);
  });

  it("orders a blueprint from dawn, so wake comes first", () => {
    const { container } = at("#/blueprints");
    const names = [...container.querySelectorAll(".slot-n")].map((n) => n.textContent);
    expect(names).toEqual(["Wake", "Breakfast", "Lunch", "Dinner", "Sleep"]);
  });
});
