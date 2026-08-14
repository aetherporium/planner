# Codex Delegation Contract — Block Library

Codex (GPT-5.4) performs best with compact, block-structured prompts using stable XML tags: state the task, the output contract, the follow-through defaults, and only the constraints that matter. Prompt it like an operator, not a collaborator.

## Rules

- One task per Codex run. Split unrelated asks into separate runs.
- Say what done looks like; Codex does not infer the end state.
- Use `task --resume-last` for iteration deltas — send only the critic's findings, not a restated prompt.
- Prefer tighter contracts over raising reasoning effort or adding prose.

## Core blocks (every dispatch)

```xml
<task>
One task. Repo/context paths, exact acceptance criteria to satisfy, current state, expected end state.
</task>
<structured_output_contract>
Return exactly: files changed, commands run with real output, and a criterion-by-criterion evidence map. Highest-risk items first. No narrative padding.
</structured_output_contract>
<default_follow_through_policy>
Default to the most reasonable low-risk interpretation and keep going.
STOP and report instead of acting when a step requires: [human gates — approvals, credentials, spend, production promotion, irreversible mutation].
</default_follow_through_policy>
```

## Add for implementation and debugging

```xml
<completeness_contract>
Resolve the task fully before stopping. Do not stop at the first plausible result. Check for follow-on fixes, edge cases, and cleanup.
</completeness_contract>
<verification_loop>
Before finalizing, verify against the task's listed evidence and the changed files or tool outputs. Read-back after every write; never report success from a write response alone. If a check fails, revise instead of reporting the first draft.
</verification_loop>
<missing_context_gating>
Do not guess missing repository or environment facts. Retrieve them with tools or state exactly what remains unknown. Stale documentation is not acceptance evidence.
</missing_context_gating>
```

## Add for write-capable or risky tasks

```xml
<action_safety>
Keep changes tightly scoped to the stated task. No unrelated refactors, renames, or cleanup.
Never: [the plan's safety invariants — secrets/PII rules, forbidden systems, scope boundaries].
Call out any risky or irreversible action before taking it.
</action_safety>
```

## Add for review / adversarial passes

```xml
<grounding_rules>
Ground every claim in the provided context or tool outputs. Label hypotheses as hypotheses.
</grounding_rules>
<dig_deeper_nudge>
After the first plausible issue, check second-order failures: empty states, retries, races, stale state, rollback paths.
</dig_deeper_nudge>
```

Prefer Codex's built-in `review` / `adversarial-review` commands when the job is reviewing local git changes — they already carry the review contract.
