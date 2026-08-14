# ADR-0021 — The now strip

**Status:** Accepted

## Context

The brief asked for "a few recent past tasks, the current task you should be
doing, and the next few". The timeline answers *what shape is this day*, which
is a different and larger question than *what should I be doing*.

## Decision

Above the timeline on today only: up to two past rows, the current task, up to
three upcoming rows.

**Only the current task has weight.** It is the one card with a background and
a border; everything else is a quiet row. Doing one thing at a time is the
priority, so exactly one thing is emphasised.

When nothing is scheduled, that is stated plainly — "Nothing scheduled right
now" — with the countdown to the next task. An empty stretch is a real part of
a day, not an error.

Past rows carry no judgement: no strike-through, no "missed", no colour. A past
task with no log entry is simply blank, per ADR-0004.

It renders only on today. Another day has no "now".

## Consequences

- Moments count as past the minute after they occur, and are never "current"
  for a stretch.
