# Planner

A planning system: Tasks on Pages, seen through swappable Views, with branching.

## Agent skills

### Issue tracker
Local markdown under `.scratch/<feature>/issues/`. See `docs/agents/issue-tracker.md`.

### Domain docs
Single-context: `CONTEXT.md` + `docs/adr/`.

## Status

The **branching question is open** — see ADR-0002. Three UI variants exist in
`prototypes/planner-ui.html`; the winner has not been picked yet. Do not build
production views until it has.

## Commands
- `npm test` — vitest run (store only; the prototype is not tested by design)
