/**
 * Navigation — "Go anywhere", promoted from prototype variant B.
 *
 * One field, no modes. Type a weekday, a bare number, a date in any shape, a
 * task, a pattern, a category — the kind is detected rather than chosen. A
 * month calendar sits inside the panel so a date can also just be pointed at,
 * which is what B was missing on its own.
 *
 * Adjacency (variant A) is separate: rails above and below the day, so the
 * neighbouring days are reachable without opening anything at all.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { search, suggestions } from "./search.js";
import { dayFromJdn, ecMonthDays, EC_MONTHS, GC_MONTHS, DOW } from "../calendar.mjs";

const EC_M_AM = [
  "መስከረም", "ጥቅምት", "ኅዳር", "ታኅሣሥ", "ጥር", "የካቲት",
  "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ",
];
const DOW_AM_2 = ["እሑ", "ሰኞ", "ማክ", "ረቡ", "ሐሙ", "ዓር", "ቅዳ"];

export default function Nav({ now, tasks, categories, prototypeMode = false }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);

  const today = dayFromJdn(now.jdn);
  const [view, setView] = useState({ y: today.ec.y, m: today.ec.m });

  const hits = useMemo(
    () => (q.trim() ? search(q, now, { tasks, categories, prototypeMode }) : suggestions(now)),
    [q, now, tasks, categories, prototypeMode],
  );

  const days = useMemo(() => ecMonthDays(view.y, view.m), [view]);
  const lead = days.length ? days[0].dow : 0;

  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable;
      if (!open && (e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) && !typing) {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowDown") { e.preventDefault(); setSel((i) => Math.min(i + 1, hits.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSel((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && hits[sel]) {
        window.location.hash = hits[sel].href;
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hits, sel]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setSel(0);
    } else {
      setQ("");
    }
  }, [open]);

  useEffect(() => setSel(0), [q]);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("hashchange", close);
    return () => window.removeEventListener("hashchange", close);
  }, []);

  const prevM = view.m === 1 ? { y: view.y - 1, m: 13 } : { y: view.y, m: view.m - 1 };
  const nextM = view.m === 13 ? { y: view.y + 1, m: 1 } : { y: view.y, m: view.m + 1 };

  return (
    <>
      <button className="go" onClick={() => setOpen(true)}>
        <Icon name="search" size={15} />
        <span>Go anywhere</span>
        <kbd>/</kbd>
      </button>

      {open ? (
        <div className="go-scrim" onClick={() => setOpen(false)}>
          <div className="go-panel glass" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Go anywhere">
            <div className="go-field">
              <Icon name="search" size={17} className="dim" />
              <input
                ref={inputRef}
                className="go-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="saturday · 17 · 8/12 · lunch · school"
                aria-label="Search"
              />
              <kbd>esc</kbd>
            </div>

            <div className="go-body">
              <div className="go-list">
                {hits.length ? (
                  hits.map((h, i) => (
                    <a
                      key={h.href + i}
                      className={`go-hit${i === sel ? " sel" : ""}`}
                      href={h.href}
                      onMouseEnter={() => setSel(i)}
                      onClick={() => setOpen(false)}
                    >
                      <span className="go-kind">{h.kind}</span>
                      <span className="go-label">{h.label}</span>
                      <span className={`go-sub${h.am ? " am" : ""}`}>{h.why ?? h.sub}</span>
                    </a>
                  ))
                ) : (
                  <div className="go-none">Nothing matches “{q}”.</div>
                )}
              </div>

              {/* A calendar, because sometimes you point instead of typing. */}
              <div className="go-cal">
                <div className="go-cal-head">
                  <button className="stepper" onClick={() => setView(prevM)} aria-label="Previous month">
                    <Icon name="chevLeft" size={14} />
                  </button>
                  <span>
                    <span className="am">{EC_M_AM[view.m - 1]}</span>{" "}
                    <span className="dim">{view.y}</span>
                  </span>
                  <button className="stepper" onClick={() => setView(nextM)} aria-label="Next month">
                    <Icon name="chevRight" size={14} />
                  </button>
                </div>
                <div className="go-grid">
                  {DOW_AM_2.map((d, i) => (
                    <span key={d} className="go-dow am" title={DOW[i]}>{d}</span>
                  ))}
                  {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
                  {days.map((d) => (
                    <a
                      key={d.jdn}
                      className={`go-day${d.jdn === now.jdn ? " today" : ""}${d.holidays.length ? " hol" : ""}`}
                      href={`#/day/${d.jdn}`}
                      onClick={() => setOpen(false)}
                      title={`${d.dowName} ${d.gc.d} ${GC_MONTHS[d.gc.m - 1]}`}
                    >
                      <span className="am">{d.ec.d}</span>
                      <small>{d.gc.d}</small>
                    </a>
                  ))}
                </div>
                <a className="go-full" href="#/calendar" onClick={() => setOpen(false)}>
                  <Icon name="calendar" size={13} />
                  Full calendar
                </a>
              </div>
            </div>

            <div className="go-foot">
              <a href="#/" onClick={() => setOpen(false)}>Today</a>
              <a href="#/calendar" onClick={() => setOpen(false)}>Calendar</a>
              <a href="#/blueprints" onClick={() => setOpen(false)}>Blueprints</a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
