/**
 * What just passed, what you should be doing, what is next.
 *
 * The timeline shows the whole shape of a day; this answers the much smaller
 * question you actually have most of the time. One task at a time is the
 * priority, so the current one is the only thing given weight.
 *
 * Nothing here is a judgement. A past task with no entry is simply blank.
 */

import Icon from "./Icon.jsx";
import { Time } from "./Mark.jsx";
import { fromDawn } from "./format.js";
import { fmtDur, STATUS, isMoment } from "../log.mjs";

export default function NowStrip({ tasks, nowMin, jdn, statusFor, pastCount = 2, futureCount = 3 }) {
  const n = fromDawn(nowMin);
  const placed = tasks
    .filter((t) => t.startMin != null)
    .map((t) => ({ t, s: fromDawn(t.startMin), e: fromDawn(t.startMin) + (t.duration ?? 0) }))
    .sort((a, b) => a.s - b.s);

  const current = placed.find((x) => !isMoment(x.t) && x.s <= n && n < x.e) ?? null;
  const past = placed.filter((x) => (isMoment(x.t) ? x.s < n : x.e <= n)).slice(-pastCount);
  const next = placed.filter((x) => x.s > n).slice(0, futureCount);

  if (!past.length && !current && !next.length) return null;

  const row = (x, kind) => {
    const st = statusFor?.(x.t.id, jdn)?.status;
    return (
      <a key={x.t.id} className={`ns-row ns-${kind}`} href={`#/task/${x.t.id}/${jdn}`}>
        <span className="ns-time"><Time min={x.t.startMin} size={6} /></span>
        <span className="ns-name">{x.t.title}</span>
        {st === STATUS.DONE ? <Icon name="check" size={13} className="ns-ok" /> : null}
        {st === STATUS.SKIPPED ? <Icon name="cross" size={13} className="dim" /> : null}
        <span className="ns-dur">{isMoment(x.t) ? "" : fmtDur(x.t.duration ?? 0)}</span>
      </a>
    );
  };

  return (
    <section className="ns" aria-label="Now">
      {past.map((x) => row(x, "past"))}

      {current ? (
        <a className="ns-row ns-now" href={`#/task/${current.t.id}/${jdn}`}>
          <span className="ns-time"><Time min={current.t.startMin} size={7} /></span>
          <span className="ns-name">{current.t.title}</span>
          <span className="ns-left">
            {Math.max(0, Math.round(current.e - n))} min left
          </span>
        </a>
      ) : (
        <div className="ns-row ns-open">
          <span className="ns-time" />
          <span className="ns-name">Nothing scheduled right now</span>
          {next.length ? (
            <span className="ns-left">
              {Math.round(next[0].s - n)} min until {next[0].t.title}
            </span>
          ) : null}
        </div>
      )}

      {next.map((x) => row(x, "next"))}
    </section>
  );
}
