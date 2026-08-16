# ADR-0025 — Prototypes are a register, not scattered routes

**Status:** Accepted (supersedes the ad-hoc route in ADR-0023)

## Context

The first prototype lived at a hand-written route that you had to already know
about. That does not scale past one, and it contradicts the rule that every
page must be reachable from the UI.

## Decision

`src/app/prototypes.js` is the single register of open design questions. Each
entry carries an id, a title, the question being asked, its variants, and the
words that should find it.

Everything reads from the register:

- **Go anywhere** — typing `prototype` (or any prefix of it) lists every
  variant of every open question; typing what it is *about* — "button",
  "frequency" — finds the relevant one. They never surface for ordinary
  searches like "lunch" or "14".
- **Settings** renders the list from the register, so adding an entry needs no
  other edit.
- Routes are `#/prototype/<id>/<variant>`.

`PrototypeShell` frames all of them: a throwaway banner, the question, a dashed
hatched stage, and a switcher with a position count. You should never be
unsure whether you are looking at the real app.

Answering a question means: build the winner properly, delete the register
entry, delete its variant file, write the ADR. An empty register makes the
Settings section disappear on its own.

## Consequences

- Adding a prototype is one entry plus one component in the `RENDER` map.
