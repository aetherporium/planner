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

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import Mark from "./Mark.jsx";
import { t12, rulerHour, fromDawn } from "./format.js";
import { fmtDur, GAP_KINDS, STATUS, isMoment } from "../log.mjs";
import { DOW, GC_MONTHS, dayFromJdn } from "../calendar.mjs";

const HOURS = Array.from({ length: 25 }, (_, i) => i);
const BASE_PX = 1.15;
const DIVIDER = 46;

/**
 * Zoom changes how many pixels a minute is worth, and with it how much detail
 * the ruler admits. At the far end an hour line is enough; up close every
 * quarter hour gets one, because that is the resolution you are working at.
 */
export const ZOOMS = [
  { id: 0.45, name: "Day", step: 180 },
  { id: 0.7, name: "Wide", step: 120 },
  { id: 1, name: "Normal", step: 60 },
  { id: 1.7, name: "Close", step: 30 },
  { id: 3, name: "Detail", step: 15 },
];

const zoomAt = (z) => ZOOMS.reduce((a, b) => (Math.abs(b.id - z) < Math.abs(a.id - z) ? b : a));

function DaySection({ jdn, timeline, statusFor, nowFromDawn, isToday, PX, step }) {
  const lines = [];
  for (let m = 0; m <= 1440; m += step) lines.push(m);

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
              <span>{onHour ? rulerHour(m) : `:${String(m % 60).padStart(2, "0")}`}</span>
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
  zoom = 1, onZoom,
}) {
  const scrollRef = useRef(null);
  const nowFromDawn = fromDawn(nowMin);
  // Water steps with the hour — the finest unit this ruler shows.
  const watermark = Math.floor(nowFromDawn / 60) * 60;

  const z = zoomAt(zoom);
  const PX = BASE_PX * z.id;
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
   * Crossing into a neighbour ARMS the change; it does not make it.
   *
   * Scrolling is how you look around, so it must not silently move you to
   * another day. Once you are well inside a neighbour a confirm bar appears
   * and you say so. Idly scrolling past the edge and back leaves you where
   * you were.
   */
  const [armed, setArmed] = useState(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rel = el.scrollTop - middleTop;
        if (rel > DAY_H * 0.75) setArmed(jdn + 1);
        else if (rel < -DAY_H * 0.25) setArmed(jdn - 1);
        else setArmed(null);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [jdn, middleTop, DAY_H]);

  return (
    <div className="tl-wrap">
      {onZoom ? (
        <div className="tl-zoom">
          <button
            type="button"
            aria-label="Less detail"
            disabled={z.id === ZOOMS[0].id}
            onClick={() => onZoom(ZOOMS[Math.max(0, ZOOMS.indexOf(z) - 1)].id)}
          >
            <Icon name="minus" size={14} />
          </button>
          <span className="tl-zoom-l">{z.name}</span>
          <button
            type="button"
            aria-label="More detail"
            disabled={z.id === ZOOMS[ZOOMS.length - 1].id}
            onClick={() => onZoom(ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(z) + 1)].id)}
          >
            <Icon name="plus" size={14} />
          </button>
        </div>
      ) : null}

      <div className="tl-scroll" style={{ height }} ref={scrollRef}>
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
                step={z.step}
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

      {armed ? (
        <a className="tl-jump" href={`#/day/${armed}`}>
          <Icon name={armed > jdn ? "arrowDown" : "arrowUp"} size={14} />
          Go to {DOW[dayFromJdn(armed).dow]} {dayFromJdn(armed).gc.d}{" "}
          {GC_MONTHS[dayFromJdn(armed).gc.m - 1].slice(0, 3)}
        </a>
      ) : null}
    </div>
  );
}
