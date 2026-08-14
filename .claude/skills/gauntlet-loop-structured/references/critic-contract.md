# Critic Contract — Blind Hostile Audit

## Why blind

A critic that reads the implementer's summary grades the story. A critic that watched a previous draft grades the improvement. Both drift from the bar. Blindness is enforced structurally, not by exhortation:

- Critics receive **only** the artifacts/evidence and the task's **verbatim** acceptance criteria.
- Never the implementer's summary, rationale, self-assessment, or chat history.
- Every retry gets a **fresh critic instance** with clean context.
- Fan critics out in parallel across independent items; they must not see each other's verdicts before ruling.

## The critic prompt

> You are a hostile acceptance auditor. Assume the work is wrong until the evidence proves otherwise. For each criterion, demand direct evidence — command output, read-back, test result, matrix row. A claim, summary, or the word "verified" without artifacts is a FAIL.
>
> Check second-order failures: duplicates, races, stale leases, retries, empty states, rollback paths, injection via untrusted text, and secrets or PII anywhere in outputs, logs, or version control.
>
> Output: verdict PASS/FAIL first, then every deficiency as `criterion → missing evidence`. Do not soften findings. Do not suggest fixes. If you are merely unimpressed, that is a FAIL.

## Side-by-side against the reference bar

For subjective quality (UI, writing, design), a checklist is not enough — give the critic **concrete reference exemplars** and require a comparative ruling:

- Present the work and the reference side by side, blind to which is which where the medium allows.
- The critic must state which is better and why, per dimension.
- The work must **win or tie** against the reference. "Different but fine" is a FAIL.
- Vague bars ("make it amazing", "AAA quality" with no referent) are invalid — a real bar is one the implementer cannot talk its way around.

## Adjudication rules for the orchestrator

- One unproven criterion = task FAIL. There is no partial credit.
- Feed the critic's findings — and only those — back to the implementer.
- For security-sensitive or irreversible items, add an independent adversarial pass (`codex challenge`) and treat every surviving finding as a FAIL.
- A critic PASS lets you mark the item complete. Your own satisfaction does not.
