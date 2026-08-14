# Issue tracker — local markdown

This repo tracks issues as **files**, not on a hosted tracker.

## Layout

```
.scratch/<feature-slug>/issues/<NN>-<slug>.md
```

Numbered from `01` in **dependency order** — blockers first.

## Ticket template

```markdown
# <NN> — <Ticket title>

**What to build:** the end-to-end behaviour this ticket makes work, from the user's
perspective — not a layer-by-layer implementation list.

**Blocked by:** the numbers/titles of the tickets that gate this one, or
"None — can start immediately".

**Status:** ready-for-agent

- [ ] Acceptance criterion 1
- [ ] Acceptance criterion 2
```

## Working the frontier

The **frontier** is any ticket whose blockers are all done. For a purely linear
chain that means top to bottom.

Do NOT close or modify a parent issue when working a child.

## Why local, not GitHub

No remote was configured at scaffold time. `setup-matt-pocock-skills` describes
local markdown as "good for solo projects or repos without a remote".

**Known tradeoff:** `/wayfinder` is materially better on a real tracker because it
uses *native blocking relationships* to render the frontier visually in the
tracker's own UI. On local markdown it falls back to a body convention. If this
project grows past one person, migrate to GitHub and re-run
`/setup-matt-pocock-skills`.

## PRs as a request surface

Off. (No remote.)
