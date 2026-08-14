/**
 * The day as 24 continuous hours, scrollable.
 *
 * Two rules drive the geometry:
 *   1. Height is time. An entry's height is its duration multiplied by the
 *      zoom, so a 45-minute meal is visibly three times a 15-minute walk.
 *      Nothing is a uniform row.
 *   2. Gaps are drawn. Rest and travel occupy their real height, because
 *      blank space is a real part of the day (ADR-0005).
 *
 * The spine on the left fills from midnight down to the current minute and
 * keeps growing as time passes.
 */

import { useEffect, useRef } from "react";
import Icon from "./Icon.jsx";
import Mark from "./Mark.jsx";
import { t12, rulerHour, fromDawn, parts } from "./format.js";
import { fmtDur, GAP_KINDS, STATUS } from "../log.mjs";

const HOURS = Array.from({ length: 25 }, (_, i) => i);

export default function Timeline({
  timeline,
  jdn,
  nowMin,
  isToday,
  pxPerMin = 1.15,
  height = 460,
  statusFor,
  scrollToNow = true,
}) {
  const scrollRef = useRef(null);
  const didScroll = useRef(false);

  const total = 1440 * pxPerMin;

  // Bring the current hour into view once, on the day that has one.
  useEffect(() => {
    if (!scrollToNow || didScroll.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const target = isToday ? fromDawn(nowMin) : 60;
    el.scrollTop = Math.max(0, target * pxPerMin - height * 0.38);
    didScroll.current = true;
  }, [isToday, nowMin, pxPerMin, height, scrollToNow]);

  // Everything on this canvas is measured from dawn, not from midnight.
  const nowFromDawn = fromDawn(nowMin);
  const fillMin = isToday ? nowFromDawn : null;

  return (
    <div className="tl-wrap">
      <div className="tl-scroll" style={{ height }} ref={scrollRef}>
        <div className="tl-canvas" style={{ height: total }}>
          {/* hour rules */}
          {HOURS.map((h) => (
            <div
              key={h}
              className={`tl-hour${h % 6 === 0 ? " major" : ""}`}
              style={{ top: h * 60 * pxPerMin }}
            >
              <div className="lab">
                <span>{rulerHour(h * 60)}</span>
                <Mark night={h >= 12 && h < 24} size={5} />
              </div>
              <div className="rule" />
            </div>
          ))}

          {/* the spine, filled up to now */}
          <div className="tl-spine">
            {fillMin != null ? (
              <div className="tl-fill" style={{ height: fillMin * pxPerMin }} />
            ) : null}
          </div>

          {isToday ? (
            <>
              <div className="tl-nowline" style={{ top: nowFromDawn * pxPerMin }} />
              <div className="tl-nowdot" style={{ top: nowFromDawn * pxPerMin }} />
            </>
          ) : null}

          <div className="tl-body">
            {timeline.map((item, i) => {
              const top = item.startMin * pxPerMin;
              const h = Math.max(
                item.kind === "overlap" ? 18 : 16,
                (item.endMin - item.startMin) * pxPerMin - 3,
              );

              if (item.kind === "overlap") {
                return (
                  <div key={`o${i}`} className="gap overlap" style={{ top, height: h }}>
                    <Icon name="warn" size={13} />
                    <span className="g-label">
                      {fmtDur(item.durationMin)} double-booked
                    </span>
                  </div>
                );
              }

              if (item.kind === "gap") {
                // Sub-20-minute gaps are noise, not rest.
                if (item.durationMin < 20) return null;
                const travel = item.gapKind === GAP_KINDS.TRAVEL;
                return (
                  <div
                    key={`g${i}`}
                    className={`gap${travel ? " travel" : ""}`}
                    style={{ top, height: h }}
                  >
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

              const cls = [
                "ev",
                tiny ? "tiny" : "",
                current ? "now" : "",
                past && !current ? "past" : "",
                st === STATUS.DONE ? "done" : "",
                st === STATUS.SKIPPED ? "skipped" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <a key={t.id} className={cls} href={`#/task/${t.id}/${jdn}`} style={{ top, height: h }}>
                  <div className="ev-row">
                    {st === STATUS.DONE ? (
                      <Icon name="check" size={13} style={{ color: "var(--accent)" }} />
                    ) : null}
                    {st === STATUS.RESCHEDULED ? <Icon name="repeat" size={13} /> : null}
                    <span className="ev-title">{t.title}</span>
                    <span className="ev-meta">
                      {t12(t.startMin)}
                      {tiny ? "" : ` · ${fmtDur(t.duration ?? 0)}`}
                    </span>
                  </div>
                  {!tiny ? (
                    <div className="ev-sub">
                      {t.place ? `${t.place}` : "No place set"}
                      {entry?.actualMin != null && entry.actualMin !== item.startMin
                        ? ` · actually ${t12(entry.actualMin)}`
                        : ""}
                    </div>
                  ) : null}
                </a>
              );
            })}
          </div>
        </div>
      </div>
      <div className="tl-fade top" />
      <div className="tl-fade bot" />
    </div>
  );
}
