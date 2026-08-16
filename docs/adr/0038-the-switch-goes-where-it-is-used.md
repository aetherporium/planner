# 0038 — A setting's switch goes where the setting is felt

Status: Accepted
Date: 2026-08-16
Amends: 0029 (prototype mode toggle)

## Context

ADR-0029 put prototype mode in Settings and had the go-anywhere panel merely
*reflect* it: when the mode was on, the panel footer showed a gold
"Prototype mode on" link pointing at `#/settings`.

That is a signpost, not a control. The prototypes are listed **in this panel**.
Turning them on meant leaving the panel, crossing to another page, finding the
switch, and coming back.

## Decision

The footer item is the switch itself — a `<button aria-pressed>` that flips
`settings.prototypeMode` in place. The panel stays open, and the results behind
it fill in immediately, because the prototype rows come from the same setting.

It is present whether the mode is on or off; that is how it is turned on. Off,
it reads as one more quiet footer item; on, it takes the gold the prototype
chrome uses elsewhere, and its dot fills.

Settings keeps its copy. This is the same setting seen from where it is used,
not a second setting.

## Consequences

The general rule: **when a panel shows the effect of a setting, that panel
should carry the setting.** A link to Settings is the weakest possible version
of a control.

Four tests cover it: pressed state when on, turning it on from inside the panel
without the panel closing and with the Prototypes section appearing, turning it
back off, and persistence to `planner:settings`.
