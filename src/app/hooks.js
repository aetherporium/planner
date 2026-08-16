import { useEffect, useState, useRef } from "react";

/**
 * Hash router. Navigation is hyperlinks (`<a href="#/...">`), never a jump
 * function, so browser back and forward work across branches and every page
 * is linkable.
 *
 * Routes:
 *   #/                        default landing — today, inside the calendar branch
 *   #/calendar                the root of the branch
 *   #/calendar/<ecY>-<ecM>    a month
 *   #/day/<jdn>               a day
 *   #/day/<jdn>/add           add to a day
 *   #/blueprints              blueprint index
 *   #/blueprint/<ruleId>      one blueprint
 *   #/task/<taskId>           one task, seen from a day
 */
export const parseHash = (raw) => {
  const h = (raw || "").replace(/^#\/?/, "");
  const parts = h.split("/").filter(Boolean);
  if (!parts.length) return { name: "today" };
  const [head, a, b] = parts;
  if (head === "calendar") {
    if (!a) return { name: "calendar" };
    const [y, m] = a.split("-").map(Number);
    return { name: "calendar", ecY: y, ecM: m };
  }
  if (head === "day" && a) {
    if (b === "add") return { name: "add", jdn: Number(a) };
    return { name: "day", jdn: Number(a) };
  }
  if (head === "blueprints") return { name: "blueprints", focus: a ?? null };
  if (head === "settings") return { name: "settings" };
  if (head === "prototype") return { name: "prototype", variant: (a ?? "A").toUpperCase() };
  if (head === "task" && a) return { name: "task", id: a, jdn: b ? Number(b) : null };
  return { name: "today" };
};

export const useRoute = () => {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
};

/** Theme, remembered. Follows the OS on first visit. */
export const useTheme = () => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("planner:theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("planner:theme", theme);
    const meta =
      document.querySelector('meta[name="theme-color"]') ??
      document.head.appendChild(
        Object.assign(document.createElement("meta"), { name: "theme-color" }),
      );
    meta.content = theme === "dark" ? "#191817" : "#f1efec";
  }, [theme]);
  return [theme, () => setTheme((t) => (t === "dark" ? "light" : "dark"))];
};

/** Ticks once a second so the clock and the progress line stay live. */
export const useNowTick = (enabled = true) => {
  const [, force] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [enabled]);
};

/** Persisted state — the user's own data only. Nothing is ever pre-filled. */
export const usePersisted = (key, initial) => {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
};
