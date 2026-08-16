# ADR-0034 — Adding belongs on task pages, twice on Blueprints

**Status:** Accepted (revokes the global add button from ADR-0026)

## Context

Choosing variant B for the add button was read as "put it in the chrome on
every page". That was an over-reach: the calendar, a task page and settings are
not places you are adding from, and an action that follows you everywhere
stops meaning anything in particular.

## Decision

The top bar carries **settings and the theme only**.

Blueprints — the page that is about tasks — carries adding **twice**, because
it has two scopes:

1. **Page header**: a filled button that says *New task* in words. This is the
   page-level action and it can afford to speak.
2. **All-tasks header**: the same destination as a bare `+` icon, sized to the
   row it sits in. The header above has already said what it does, so
   repeating the words would be noise.

The day page keeps its own add affordance in context. `#/add` still resolves
to today for anything that links to it.

## Consequences

- `Top` no longer takes `addHref` or `hideAdd`.
