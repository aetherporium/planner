/**
 * The day as continuous hours, scrollable, anchored at dawn.
 *
 * Height is duration: a 45-minute meal is three times a 15-minute walk.
 * Gaps are drawn at their real height, because blank space is real.
 *
 * TIME PASSED reads as water. It is a tint that rises behind everything with a
 * moving surface line, so it shows how much of the day is gone without hiding
 * anything it covers — the entries stay fully legible, they just sit under it.
 *
 * A MOMENT (a task with no duration, like waking) is a line across the day, not
 * a block. It marks an instant rather than occupying a stretch.
 */

import { useEffect, useRef } from "react";
import Icon from "./Icon.jsx";
import Mark from "./Mark.jsx";
import { t12, rulerHour, fromDawn } from "./format.js";
import { fmtDur, GAP_KINDS, STATUS } from "../log.mjs";

const HOURS = Array.from({ length: 25 }, (_, i) => i);

export default function Timeline({
  timeline,
  jdn,
  nowMin,
  isToday,
  pxPerMin = 1.15,
  height = 520,
  statusFor,
  scrollToNow = true,
}) {
  const scrollRef = useRef(null);
  const didScroll = useRef(false);
  const total = 1440 * pxPerMin;
  const nowFromDawn = fromDawn(nowMin);

  useEffect(() => {
    if (!scrollToNow || didScroll.current) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = Math.max(0, (isToday ? nowFromDawn : 60) * pxPerMin - height * 0.36);
    didScroll.current = true;
  }, [isToday, nowFromDawn, pxPerMin, height, scrollToNow]);

  return (
    <div className="tl-wrap">
      <div className="tl-scroll" style={{ height }} ref={scrollRef}>
        <div className="tl-canvas" style={{ height: total }}>
          {/* hour rules */}
          {HOURS.map((h) => (
            <div key={h} className={`tl-hour${h % 6 === 0 ? " major" : ""}`} style={{ top: h * 60 * pxPerMin }}>
              <div className="lab">
                <span>{rulerHour(h * 60)}</span>
                <Mark night={h >= 12 && h < 24} size={5} />
              </div>
              <div className="rule" />
            </div>
          ))}

          {/* WATER — time already spent. Sits behind everything, hides nothing. */}
          {isToday ? (
            <div className="water" style={{ height: nowFromDawn * pxPerMin }} aria-hidden="true">
              <div className="water-body" />
              <div className="water-surface">
                <svg width="100%" height="10" viewBox="0 0 600 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 37 0 75 5 T 150 5 T 225 5 T 300 5 T 375 5 T 450 5 T 525 5 T 600 5 V10 H0 Z" />
                </svg>
              </div>
            </div>
          ) : null}

          <div className="tl-body">
            {timeline.map((item, i) => {
              const top = item.startMin * pxPerMin;

              /* A moment: a hairline with a dot, no block. */
              if (item.kind === "moment") {
                const t = item.task;
                const entry = statusFor?.(t.id, jdn);
                const done = entry?.status === STATUS.DONE;
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
                (item.endMin - item.startMin) * pxPerMin - 3,
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
        </div>
      </div>
      <div className="tl-fade top" />
      <div className="tl-fade bot" />
    </div>
  );
}
