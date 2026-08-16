# 0036 — Focus belongs to whoever is typing

Status: Accepted
Date: 2026-08-16

## Context

Typing in a popup field threw the caret out of the field. It was reported
against the go-anywhere search box; the actual defect was in `Popup`, and it
affected every field inside every popup.

`Popup` opened with:

    useEffect(() => {
      ...
      ref.current?.focus();
      return () => { ... };
    }, [onClose]);

`onClose` is written inline at all five call sites (`onClose={() => setOpen(null)}`),
so a new function identity arrives on every render of the page behind it. The
page re-renders once a second, because `useNowTick` drives the clock. So the
effect tore down, re-ran, and re-focused the dialog **once a second** — pulling
the caret out of whatever field was being typed in, roughly as fast as anyone
can type a word.

Measured, with fake timers: after opening the new-category popup and typing
`Sch`, one 1000 ms tick moved `document.activeElement` from the `<input>` to
the `.pop` div. The text survived; the caret did not.

## Decision

Focus on open, once. Bind listeners once, and reach the current close handler
through a ref rather than through a dependency:

* `closeRef.current = onClose` on every render, assigned during render.
* Escape and hashchange listeners bind in an effect with `[]`.
* `ref.current?.focus()` moves to its own effect with `[]`.

Separately, `Nav` derived its results from the whole `now` object, which
`readNow()` rebuilds every second. Search cares about the day and the minute,
not the second or the millisecond, so it now depends on `now.jdn` and
`now.minutes`. The results stop being rebuilt underneath the person typing.

## Consequences

A live clock must not be allowed to reach the focus ring. The general rule:
**an effect that steals focus, scrolls, or selects must depend on the thing
that opened it — never on a callback prop.** Inline callbacks are fine at the
call site; they are not fine as dependencies of an imperative effect.

Three regression tests now hold this: one per field, advancing five seconds of
fake time and asserting the same node still has the caret and the value, plus a
source assertion that the focus effect has an empty dependency list.

Do not "fix" a future recurrence by re-focusing on a timer. That trades one
stolen caret for another.
