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

import { useEffect, useLayoutEffect, useRef } from "react";
import Icon from "./Icon.jsx";
import Mark from "./Mark.jsx";
import { t12, rulerHour, fromDawn } from "./format.js";
import { fmtDur, GAP_KINDS, STATUS, isMoment } from "../log.mjs";
import { DOW, GC_MONTHS, dayFromJdn } from "../calendar.mjs";

const HOURS = Array.from({ length: 25 }, (_, i) => i);
const PX = 1.15;
const DAY_H = 1440 * PX;
const DIVIDER = 46;

function DaySection({ jdn, timeline, statusFor, nowFromDawn, isToday }) {
  return (
    <>
      {HOURS.map((h) => (
        <div key={h} className={`tl-hour${h % 6 === 0 ? " major" : ""}`} style={{ top: h * 60 * PX }}>
          <div className="lab">
            <span>{rulerHour(h * 60)}</span>
            <Mark night={h >= 12 && h < 24} size={5} />
          </div>
          <div className="rule" />
        </div>
      ))}

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

export default function Timeline({ jdn, nowMin, nowJdn, timelineFor, statusFor, height = 520 }) {
  const scrollRef = useRef(null);
  const nowFromDawn = fromDawn(nowMin);
  // Water steps with the hour — the finest unit this ruler shows.
  const watermark = Math.floor(nowFromDawn / 60) * 60;

  const days = [jdn - 1, jdn, jdn + 1];
  const offsetOf = (i) => i * (DAY_H + DIVIDER);
  const middleTop = offsetOf(1);

  // Land on the current day, at the current hour, without animating on arrival.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const within = jdn === nowJdn ? nowFromDawn * PX - height * 0.36 : 60 * PX;
    el.scrollTop = middleTop + Math.max(0, within);
  }, [jdn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scrolling far enough into a neighbour makes it the day you are on.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rel = el.scrollTop - middleTop;
        if (rel > DAY_H * 0.62) window.location.hash = `#/day/${jdn + 1}`;
        else if (rel < -DAY_H * 0.38) window.location.hash = `#/day/${jdn - 1}`;
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [jdn, middleTop]);

  return (
    <div className="tl-wrap">
      <div className="tl-scroll" style={{ height }} ref={scrollRef}>
        <div className="tl-track" style={{ height: days.length * DAY_H + (days.length - 1) * DIVIDER }}>
          {days.map((d, i) => (
            <div key={d} className={`tl-day${d === jdn ? " current" : " neighbour"}`}
              style={{ top: offsetOf(i), height: DAY_H }}>
              <DaySection
                jdn={d}
                timeline={timelineFor(d)}
                statusFor={statusFor}
                nowFromDawn={watermark}
                isToday={d === nowJdn}
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
    </div>
  );
}
