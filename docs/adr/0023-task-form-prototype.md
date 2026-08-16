# ADR-0023 — Task form prototype (open question)

**Status:** Proposed — awaiting the user's pick

## Context

The form now carries name, description, date, time, duration, frequency, place
and category, with four of them required. That is enough fields that the shape
of the asking matters.

## Decision

Three variants at `#/prototype/<A|B|C>`, reached from Settings, switchable from
the floating bar. All three collect identical fields and enforce identical
requirements — they disagree only about shape, which is the real question.

- **A — Ladder.** One page, everything visible, grouped under headings.
  Nothing hidden and nothing to discover; long on a phone.
- **B — Steps.** Three gates: what, when, details. A gate will not open with a
  requirement unmet, so the rules teach themselves. Costs three taps.
- **C — Sentence.** The task is one plain sentence with the fields as blanks
  inside it. Reads back as English and is tightest on space; awkward for long
  descriptions, which is why they sit below.

## Consequences

- `src/app/prototype-form.jsx` is throwaway and marked on screen. When one
  wins it gets rewritten properly into `AddPage` and the file, its CSS block
  and the `#/prototype` route are deleted.
- The live `AddPage` currently uses shape A, so the app is usable meanwhile.
