# ADR-0024 — Categories: optional, any colour, optional icon

**Status:** Accepted (amends ADR-0013)

## Context

Creating a category demanded a colour from a fixed palette of six. Choosing a
colour is not part of deciding that "School" is a thing you have, and six is an
arbitrary ceiling.

## Decision

- **Only the name is required.** A colour is already chosen when the form
  opens; the presets are a shortcut, not a question.
- **Any colour is allowed.** Colours are stored as plain hex and there is a
  native picker beside the presets. `colorOf` accepts any valid hex.
- **An optional icon**, from a set of sixteen line icons — real SVG, not emoji,
  so it inherits colour and stroke weight.
- Pickers are **rounded squares**, not circles, and a live preview pill shows
  the result.
- **Categories themselves remain optional.** Nothing requires one, and the task
  list works fine with everything uncategorised.

## Consequences

- The stored shape is `{ id, name, color: "#rrggbb", icon: string | null }`.
- Deleting a category still releases its tasks rather than deleting them.
