# ADR-0011 — React app, not a single HTML file

**Status:** Accepted (supersedes the `prototypes/*.html` approach)

## Context

The prototype was one hand-written HTML file with a hand-rolled render loop.
It answered layout questions but could not answer behaviour questions: nothing
was testable, every state change re-rendered the world, and the file was
approaching 40kb of string concatenation.

## Decision

Vite + React. The pure domain modules (`calendar.mjs`, `blueprint.mjs`,
`log.mjs`, `defaults.mjs`) are untouched — they had no DOM dependency by
design, so the UI layer imports them directly and they keep their own tests.

Layout:

```
src/calendar.mjs  blueprint.mjs  log.mjs  defaults.mjs   pure domain, no DOM
src/app/App.jsx        pages + routing
src/app/store.js       app state over the domain modules, localStorage-backed
src/app/hooks.js       router, theme, tick, persistence
src/app/Timeline.jsx   the 24-hour day
src/app/Clock.jsx      analog + digital
src/app/Icon.jsx       line icons
src/app/app.test.jsx   29 render + rule tests (jsdom)
```

## Consequences

- The honesty rules are now *tested against the rendered UI*, not just the
  pure functions: the future-completion block, blank-by-default, absence of
  punishing language, and Amharic staying inside the calendar are all asserted.
- Real wall-clock time replaces the simulated clock. The timeline fill and the
  second hand both advance from a one-second tick.
- `prototypes/` is deleted. The app is the artifact.
