# ADR-0026 — How loud the New task button should be (open question)

**Status:** Proposed — awaiting the user's pick

## Context

The filled accent button top-right of Blueprints pulls the eye before the
content does, and reads as out of place next to everything else on the page.
It is the most important *action*, but the page's job is looking at what you
already have. Weight and position were never actually decided — it was just
the loudest thing available.

## Decision

Four placements at `#/prototype/addbtn/<A|B|C|D>`, each shown against real page
furniture rather than on a blank canvas.

- **A — Quiet.** Same size and shape as Settings, accent text only. Calmest;
  risks being missed by a new user.
- **B — Split.** Outlined and tinted rather than filled. Reads as primary
  without shouting. Middle ground.
- **C — Icon.** Round, floating bottom-right, out of the reading path. Always
  reachable and a familiar pattern — but it collides with the go-anywhere
  pill, which is a real cost and is called out on the variant itself.
- **D — First card.** A square at the head of the strip, so adding sits among
  the things it makes. Most cohesive; least obviously a primary action, and
  only visible when a strip is.

## Consequences

- The live page keeps the current button until one is chosen.
- C would need the go-anywhere pill moved or the two merged.
