# Planner

**Try it: https://aetherporium.github.io/planner/**

A day planner built around the **Ethiopian calendar and dawn-anchored time**.

The day runs dawn to dawn. 06:00 Gregorian is 12:00 here, and the clock is
12-hour with a visual day/night mark rather than the letters "AM" and "PM".
Dates are Ethiopian — thirteen months, Nehase and Pagumē included — with the
Gregorian date shown alongside rather than instead.

## Feedback

It is being tried out, so it will have rough edges. If something is wrong,
confusing, or missing, [open an issue](https://github.com/aetherporium/planner/issues/new)
— or use **Settings → Feedback** inside the app, which fills in the build and
browser details automatically.

Saying what you *expected* to happen is more useful than a diagnosis.

Your plans never leave your browser: there is no account, no server, and
nothing is uploaded. Everything is stored in `localStorage` on your own device,
which also means clearing site data clears your plans, and two devices do not
share anything.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 338 tests
npm run build
```

No backend, no accounts, no network. Everything lives in `localStorage` under
the `planner:` prefix.

## The idea

Most planners are a list of times with names attached. This one tries to make
the day legible as a *shape*: 24 continuous hours you scroll through, where
height is duration, a task with no duration is a moment rather than a block,
and the gaps between things are drawn as explicitly as the things themselves.

A few decisions that follow from that:

- **The page is the scroller.** The clock and date are the top of the day, not
  a fixed frame above it. Scroll down and they leave; a thin rail keeps the
  digital time and what you are doing now.
- **A day ends.** Yesterday and tomorrow are one deliberate click away, not
  somewhere you drift into mid-scroll.
- **Scheduling conflicts are shown, never silently refused.** Overlapping is
  sometimes correct — a call during a commute is real.
- **Nothing is fabricated.** No seeded data, no invented log entries, no
  streaks and no failure language. Demo content exists but only loads when you
  ask for it in Settings.
- **Zoom is continuous**, driven by ctrl+wheel and ctrl +/−, from the whole day
  down to a line every 30 seconds.

## Layout

```
src/
  calendar.mjs      Ethiopian ↔ Gregorian ↔ JDN, holidays, month lengths
  log.mjs           the timeline: gaps, moments, overlaps, conflicts
  kinds.mjs         task kinds — plain, tally, measure, checklist
  blueprint.mjs     recurrence rules
  patterns.mjs      patterns derived from what you actually scheduled
  defaults.mjs      the six built-in tasks
  app/              React: Timeline, DayHeader, Blueprints, Nav, Settings…
docs/adr/           42 architecture decision records
```

`docs/adr/` is the real documentation. Each record says what was tried, what
was wrong with it, and what replaced it — including the reversals, which are
the useful part.

## Testing

338 tests. They lean on asserting *rules* rather than snapshots: that no task
block extends past the end of the day, that no hydration slot lands during
sleep, that every page is reachable from the UI, that no global keystroke opens
a view. jsdom does not lay out, so CSS contracts are asserted by reading
`styles.css` directly.

## Status

Working, and unfinished. Known gaps: weekly/monthly/goal-level scheduling that
distributes itself across free time, and category assignment inside the task
edit form.
