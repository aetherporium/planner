/**
 * A task you fill up rather than finish.
 *
 * Water is the clear case: it has no place on the clock, it is not done or
 * not-done, and the honest reading is "how much, out of how much, by now".
 * The pace marker says where you would be if you had spread it evenly — shown
 * as a tick, not a scold. Being behind at 2pm is normal.
 */

import Icon from "./Icon.jsx";
import { progressOf, readProgress, paceTarget } from "../kinds.mjs";
import { KIND } from "../kinds.mjs";

export default function Tally({ task, entry, nowFromDawn, onAdd, onSet, compact }) {
  const p = progressOf(task, entry);
  if (!p) return null;

  const step = task.step ?? 250;
  const pace = paceTarget(task, nowFromDawn);
  const behind = pace != null && p.done < pace;
  const met = p.total != null && p.done >= p.total;

  return (
    <div className={`tally${compact ? " compact" : ""}${met ? " met" : ""}`}>
      <div className="tally-head">
        <span className="tally-name">
          <Icon name={task.kind === KIND.TALLY ? "water" : "gauge"} size={15} />
          {task.title}
        </span>
        <span className="tally-read">
          {readProgress(task, entry)}
          {met ? <Icon name="check" size={13} /> : null}
        </span>
      </div>

      <div className="tally-bar">
        <span className="tally-fill" style={{ width: `${(p.ratio ?? 0) * 100}%` }} />
        {pace != null && p.total ? (
          <span
            className="tally-pace"
            style={{ left: `${Math.min(100, (pace / p.total) * 100)}%` }}
            title={`Even pace by now: ${pace} ${p.unit}`}
          />
        ) : null}
      </div>

      {!compact ? (
        <div className="tally-acts">
          <button type="button" className="btn sm" onClick={() => onAdd(-step)} disabled={!p.done}>
            <Icon name="minus" size={13} />
          </button>
          <button type="button" className="btn sm wide" onClick={() => onAdd(step)}>
            <Icon name="plus" size={13} />
            {step} {p.unit}
          </button>
          {p.total ? (
            <button type="button" className="btn sm" onClick={() => onSet(p.total)} disabled={met}>
              Full
            </button>
          ) : null}
          {p.done ? (
            <button type="button" className="linkline" onClick={() => onSet(0)}>
              Reset
            </button>
          ) : null}
        </div>
      ) : (
        <button type="button" className="tally-quick" onClick={() => onAdd(step)}>
          <Icon name="plus" size={12} />
          {step} {p.unit}
        </button>
      )}

      {!compact && behind && !met ? (
        <p className="tally-note">
          Even pace would be {pace} {p.unit} by now. No harm in catching up later.
        </p>
      ) : null}
    </div>
  );
}
