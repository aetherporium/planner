/**
 * The day as continuous hours, anchored at dawn.
 *
 * ONE TIMELINE, THREE DAYS. Yesterday, today and tomorrow live in the same
 * scroller, separated by a divider rather than by a page load. Moving between
 * days scrolls; it does not replace the screen.
 *
 * Height is duration. A moment (no duration) is a hairline, not a block.
 *
 * WATER marks time already spent. It does not animate: the smallest unit shown
 * on this ruler is the hour, so the level steps when an hour passes and is
 * still in between. Only the second hand moves continuously, because seconds
 * are the only unit displayed at that resolution.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import Mark from "./Mark.jsx";
import { t12, rulerHour, fromDawn } from "./format.js";
import { fmtDur, GAP_KINDS, STATUS, isMoment } from "../log.mjs";
import { DOW, GC_MONTHS, dayFromJdn } from "../calendar.mjs";

const HOURS = Array.from({ length: 25 }, (_, i) => i);
const BASE_PX = 1.15;
const DIVIDER = 46;

/**
 * Zoom is continuous, not a set of named stops. You keep going in until the
 * ruler is as fine as you need; the labels follow the scale rather than the
 * scale following the labels.
 *
 * At the far end a line every 30 SECONDS is legible, which is the real limit
 * of "more detail" for a day planner.
 */
export const ZOOM_MIN = 0.4;
export const ZOOM_MAX = 120;
const ZOOM_FACTOR = 1.6;

/** 100% is the readable default; the readout is relative to that. */
export const zoomPercent = (scale) => {
  const pc = scale * 100;
  if (pc >= 1000) return `${Math.round(pc / 100) * 100}%`;
  if (pc >= 100) return `${Math.round(pc / 10) * 10}%`;
  return `${Math.round(pc)}%`;
};

/** The finest gridline that still leaves ~46px between lines at this scale. */
function gridFor(px) {
  const steps = [0.5, 1, 2, 5, 10, 15, 30, 60, 180];
  for (const m of steps) if (m * px >= 46) return m;
  return 180;
}

/** "1:30" · "1:30:30" — a label that says exactly which instant it marks. */
function lineLabel(m) {
  if (m % 60 === 0) return rulerHour(m);
  const mm = Math.floor(m % 60);
  const ss = Math.round((m % 1) * 60);
  return ss ? `:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
            : `:${String(mm).padStart(2, "0")}`;
}

const zoomName = (step) => {
  if (step >= 180) return "3 hr";
  if (step >= 60) return `${step / 60} hr`;
  if (step >= 1) return `${step} min`;
  return `${Math.round(step * 60)} sec`;
};

function DaySection({ jdn, timeline, statusFor, nowFromDawn, isToday, PX, step, view, onSip }) {
  /**
   * Only draw the lines that are actually on screen. At 30-second resolution
   * a full day is 2880 lines per day and three days would be 8640 nodes —
   * enough to make scrolling stutter.
   */
  const from = Math.max(0, Math.floor(view.from / step) * step);
  const to = Math.min(1440, Math.ceil(view.to / step) * step);
  const lines = [];
  for (let m = from; m <= to; m += step) lines.push(Number(m.toFixed(4)));

  return (
    <>
      {lines.map((m) => {
        const onHour = m % 60 === 0;
        return (
          <div
            key={m}
            className={`tl-hour${m % 360 === 0 ? " major" : ""}${onHour ? "" : " sub"}`}
            style={{ top: m * PX }}
          >
            <div className="lab">
              <span>{lineLabel(m)}</span>
              {onHour ? <Mark night={m >= 720 && m < 1440} size={5} /> : null}
            </div>
            <div className="rule" />
          </div>
        );
      })}

      {/* Water: a level, stepped to the hour. No motion. */}
      {isToday ? (
        <div className="water" style={{ height: nowFromDawn * PX }} aria-hidden="true">
          <div className="water-body" />
          <div className="water-line" />
        </div>
      ) : null}

      <div className="tl-body">
        {timeline.map((item, i) => {
          const top = item.startMin * PX;

          /**
           * A planned sip. Small, on the ruler where it belongs, and doable
           * in one tap from here — the point is to do it as planned, not to
           * remember a total at the end of the day.
           */
          if (item.kind === "slot") {
            const t = item.task;
            const entry = statusFor?.(t.id, jdn);
            const poured = Math.floor((entry?.amount ?? 0) / (t.slotAmount ?? 250));
            const done = item.index < poured;
            const due = isToday && item.startMin <= nowFromDawn && !done;
            return (
              <button
                key={`${t.id}-${item.index}`}
                type="button"
                className={`sip${done ? " done" : ""}${due ? " due" : ""}`}
                style={{ top }}
                title={`${t.title} — ${t.slotAmount} ${t.unit}`}
                onClick={(e) => {
                  e.preventDefault();
                  onSip?.(t, done ? -(t.slotAmount ?? 250) : (t.slotAmount ?? 250));
                }}
              >
                <span className="sip-dot">
                  <Icon name={done ? "check" : "water"} size={10} />
                </span>
                <span className="sip-n">{t.slotAmount} {t.unit}</span>
              </button>
            );
          }

          if (item.kind === "moment") {
            const t = item.task;
            const done = statusFor?.(t.id, jdn)?.status === STATUS.DONE;
            return (
              <a
                key={t.id}
                className={`mo${done ? " done" : ""}${isToday && item.startMin <= nowFromDawn ? " past" : ""}`}
                href={`#/task/${t.id}/${jdn}`}
                style={{ top }}
              >
                <span className="mo-dot" />
                <span className="mo-line" />
                <span className="mo-name">{t.title}</span>
                <span className="mo-time">{t12(t.startMin)}</span>
              </a>
            );
          }

          const h = Math.max(
            item.kind === "overlap" ? 18 : 16,
            (item.endMin - item.startMin) * PX - 3,
          );

          if (item.kind === "overlap") {
            return (
              <div key={`o${i}`} className="gap overlap" style={{ top, height: h }}>
                <Icon name="warn" size={13} />
                <span className="g-label">{fmtDur(item.durationMin)} double-booked</span>
              </div>
            );
          }

          if (item.kind === "gap") {
            if (item.durationMin < 20) return null;
            const travel = item.gapKind === GAP_KINDS.TRAVEL;
            return (
              <div key={`g${i}`} className={`gap${travel ? " travel" : ""}`} style={{ top, height: h }}>
                <Icon name={travel ? "travel" : "rest"} size={13} />
                <span className="g-label">
                  {travel
                    ? `Travel ${item.from} to ${item.to} — ${fmtDur(item.durationMin)}`
                    : `Rest — ${fmtDur(item.durationMin)}`}
                </span>
              </div>
            );
          }

          const t = item.task;
          const entry = statusFor?.(t.id, jdn);
          const st = entry?.status;
          const past = isToday ? item.endMin <= nowFromDawn : false;
          const current = isToday && item.startMin <= nowFromDawn && nowFromDawn < item.endMin;
          const tiny = h < 34;

          return (
            <a
              key={t.id}
              className={["ev", tiny ? "tiny" : "", current ? "now" : "", past && !current ? "past" : "",
                st === STATUS.DONE ? "done" : "", st === STATUS.SKIPPED ? "skipped" : ""]
                .filter(Boolean).join(" ")}
              href={`#/task/${t.id}/${jdn}`}
              style={{ top, height: h }}
            >
              <div className="ev-row">
                {st === STATUS.DONE ? <Icon name="check" size={13} style={{ color: "var(--accent)" }} /> : null}
                {st === STATUS.RESCHEDULED ? <Icon name="move" size={13} /> : null}
                <span className="ev-title">{t.title}</span>
                <span className="ev-meta">
                  {t12(t.startMin)}
                  {tiny ? "" : ` · ${fmtDur(t.duration ?? 0)}`}
                </span>
              </div>
              {!tiny ? (
                <div className="ev-sub">
                  {t.place ? t.place : "No place set"}
                  {entry?.actualMin != null && entry.actualMin !== t.startMin
                    ? ` · actually ${t12(entry.actualMin)}`
                    : ""}
                </div>
              ) : null}
            </a>
          );
        })}
      </div>
    </>
  );
}

function Divider({ jdn, dir }) {
  const d = dayFromJdn(jdn);
  return (
    <a className={`tl-div tl-div-${dir}`} href={`#/day/${jdn}`}>
      <span className="tl-div-rule" />
      <span className="tl-div-label">
        <Icon name={dir === "prev" ? "arrowUp" : "arrowDown"} size={13} />
        {DOW[d.dow]} {d.gc.d} {GC_MONTHS[d.gc.m - 1].slice(0, 3)}
      </span>
      <span className="tl-div-rule" />
    </a>
  );
}

export default function Timeline({
  jdn, nowMin, nowJdn, timelineFor, statusFor, height = 520,
  zoom = 1, onZoom, onVisibleDay, onSip,
}) {
  const scrollRef = useRef(null);
  const nowFromDawn = fromDawn(nowMin);
  // Water steps with the hour — the finest unit this ruler shows.
  const watermark = Math.floor(nowFromDawn / 60) * 60;

  const scale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
  const PX = BASE_PX * scale;
  const step = gridFor(PX);
  const DAY_H = 1440 * PX;

  const days = [jdn - 1, jdn, jdn + 1];
  const offsetOf = (i) => i * (DAY_H + DIVIDER);
  const middleTop = offsetOf(1);

  const today = timelineFor(jdn);

  /**
   * Land on what is happening, not on an arbitrary hour.
   *
   * Opening today should put you at the task in progress — or, if nothing is,
   * the last one that finished, because that is the thing you were doing.
   * Falling back to the raw clock position would often show empty ruler.
   */
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let anchor = 60;
    if (jdn === nowJdn) {
      const blocks = today.filter((i) => i.kind === "task" || i.kind === "moment");
      const current = blocks.find((i) => i.startMin <= nowFromDawn && nowFromDawn < i.endMin);
      const previous = [...blocks].reverse().find((i) => i.endMin <= nowFromDawn);
      anchor = (current ?? previous)?.startMin ?? nowFromDawn;
    }
    el.scrollTop = middleTop + Math.max(0, anchor * PX - height * 0.3);
  }, [jdn, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Zoom by wheel and by keyboard, the way every other canvas works.
   *
   * Ctrl/⌘ + wheel is the platform convention, and a bare pinch on a trackpad
   * arrives as exactly that. The point under the cursor stays put, otherwise
   * zooming throws you somewhere else in the day.
   *
   * The buttons remain, but they are no longer the only way in.
   */
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const zoomAround = useCallback(
    (factor, clientY) => {
      const el = scrollRef.current;
      if (!el || !onZoom) return;
      const current = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomRef.current));
      const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, current * factor));
      if (next === current) return;

      const box = el.getBoundingClientRect();
      const anchor = clientY == null ? el.clientHeight / 2 : clientY - box.top;
      const before = (el.scrollTop + anchor) / current;

      onZoom(next);
      requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = before * next - anchor;
      });
    },
    [onZoom],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !onZoom) return undefined;

    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;   // plain wheel still scrolls
      e.preventDefault();
      zoomAround(Math.exp(-e.deltaY * 0.0015), e.clientY);
    };

    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "+" || e.key === "=") { e.preventDefault(); zoomAround(ZOOM_FACTOR); }
      else if (e.key === "-" || e.key === "_") { e.preventDefault(); zoomAround(1 / ZOOM_FACTOR); }
      else if (e.key === "0") { e.preventDefault(); onZoom(1); }
    };

    // non-passive: the browser will not let us preventDefault otherwise
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("keydown", onKey);
    };
  }, [zoomAround, onZoom]);

  /**
   * Scrolling between days is FREE. Yesterday, today and tomorrow are one
   * strip of time and you can move through all of it — an earlier version
   * made you click a button to cross a boundary, which turned a scroll into
   * a decision for no reason.
   *
   * What the scroll position changes is the LABEL: whichever day fills most
   * of the viewport is the one the header names. The URL only changes when
   * you actually settle on another day, so back still works.
   */
  const [visible, setVisible] = useState(jdn);
  const [view, setView] = useState({ from: 0, to: 1440 });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    let frame = 0;

    const measure = () => {
      const mid = el.scrollTop + el.clientHeight / 2;
      const i = Math.min(days.length - 1, Math.max(0, Math.floor(mid / (DAY_H + DIVIDER))));
      setVisible(days[i]);

      // Which slice of the day is on screen, so the ruler only draws that.
      const top = el.scrollTop - offsetOf(i);
      setView({
        from: Math.max(0, top / PX - 120),
        to: Math.min(1440, (top + el.clientHeight) / PX + 120),
      });
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    measure();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [jdn, DAY_H, PX, days.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tell the page which day is being looked at, so its header can follow.
  useEffect(() => { onVisibleDay?.(visible); }, [visible, onVisibleDay]);

  return (
    <div className="tl-wrap">
      <div className="tl-scroll" style={{ height }} ref={scrollRef} tabIndex={-1}>
        <div className="tl-track" style={{ height: days.length * DAY_H + (days.length - 1) * DIVIDER }}>
          {days.map((d, i) => (
            <div key={d} className={`tl-day${d === jdn ? " current" : " neighbour"}`}
              style={{ top: offsetOf(i), height: DAY_H }}>
              <DaySection
                jdn={d}
                timeline={d === jdn ? today : timelineFor(d)}
                statusFor={statusFor}
                nowFromDawn={watermark}
                isToday={d === nowJdn}
                PX={PX}
                step={step}
                view={view}
                onSip={onSip}
              />
            </div>
          ))}
          {days.slice(1).map((d, i) => (
            <div key={`div${d}`} className="tl-div-slot" style={{ top: offsetOf(i) + DAY_H, height: DIVIDER }}>
              <Divider jdn={d} dir="next" />
            </div>
          ))}
        </div>
      </div>
      <div className="tl-fade top" />
      <div className="tl-fade bot" />

      {onZoom ? (
        <div className="tl-zoom">
          <button
            type="button"
            aria-label="Zoom out"
            disabled={scale <= ZOOM_MIN * 1.001}
            onClick={() => zoomAround(1 / ZOOM_FACTOR)}
          >
            <Icon name="minus" size={14} />
          </button>
          <button
            type="button"
            className="tl-zoom-l"
            title="Reset zoom · ctrl+scroll or ctrl +/− also work"
            aria-label={`Zoom ${zoomPercent(scale)} — reset`}
            onClick={() => onZoom(1)}
          >
            {zoomPercent(scale)}
            <small>{zoomName(step)}</small>
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            disabled={scale >= ZOOM_MAX * 0.999}
            onClick={() => zoomAround(ZOOM_FACTOR)}
          >
            <Icon name="plus" size={14} />
          </button>
        </div>
      ) : null}

    </div>
  );
}
