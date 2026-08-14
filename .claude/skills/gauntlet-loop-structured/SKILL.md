---
name: gauntlet-loop-structured
description: Use when the user invokes /gauntlet-loop or asks to turn an objective, plan, spec, PRD, or requirements document (inline text, a .md file, or an .html file) into an orchestrated execution system prompt — e.g. "gauntlet this plan", "make an orchestrator prompt for this spec", "generate the execution prompt for @plan.md".
metadata:
  author: NicholasSpisak
  version: "1.0.0"
  argument-hint: <objective, path/to/plan.md, or path/to/spec.html>
---

# Gauntlet Loop

## Overview

Gauntlet Loop turns any objective or plan document into a **fully optimized, copy/paste system prompt** that executes the work through three separated roles:

- **Orchestrator/Critic** (Claude): decomposes, delegates, adjudicates evidence — never implements.
- **Implementer** (Codex): produces every artifact through block-structured delegation contracts.
- **Blind critics** (fresh-context sub-agents): hostile auditors who never see the implementer's self-assessment and loop the work until the evidence — not the claims — passes.

Core principles: **the agent that implements never grades its own work, a critic that watched a previous draft never grades the retry, and the bar must be real — something concrete the critic can hold the work against, not "make it amazing."** The pattern extends Matt Shumer's Gauntlet Loop ([somethingbig.ai/gauntlet-loop](https://somethingbig.ai/gauntlet-loop)).

Your output is the generated system prompt itself, in one fenced code block, ready to paste into a fresh session. You do not execute the plan.

## Input handling

Accept exactly one input, in any of three forms:

1. **Inline objective** — free text after the command. Use it as the mission directly.
2. **Markdown file** — read it. Treat it as the source-of-truth plan.
3. **HTML file** — read it and extract the meaningful content (headings, lists, tables, checklists); ignore markup, nav, and styling.

If no input is given, ask for one — that is the only question you ask.

## Analysis pass (before writing the prompt)

Extract from the input, in this order:

1. **Mission** — the destination in one paragraph, with the source document named as the single source of truth. State *what*, never *how*: the implementer owns architecture.
2. **Acceptance criteria / evidence** — every checkbox, gate, SLA, metric, or "done means" statement. These become the critic's bar. If the input has none, derive 3–7 measurable criteria from the objective and mark them `DERIVED — confirm before running`.
3. **Reference bar** — concrete exemplars the work will be compared against side by side: a production app, a shipped competitor, benchmark screenshots, exemplary documents. Required whenever quality is partly subjective (UI, writing, design); vague targets fail. If the input names none, pick the strongest real-world exemplar class and mark it `DERIVED`.
4. **Human gates** — approvals, sign-offs, vendor contracts, credential provisioning, spend, production promotion, irreversible mutations. These become hard stops the loop may never override.
5. **Safety invariants** — secrets/PII rules, scope boundaries, systems that must not be touched, anything phrased "never" or "do not".
6. **Sequence and fan-out surfaces** — decompose into the smallest pieces that can be improved and judged separately; identify what is gated-sequential vs. independently verifiable in parallel (per-item checks, test matrices, per-host rollouts).

## Output contract

Emit one fenced code block containing the complete system prompt, assembled from the canonical template in [references/prompt-template.md](references/prompt-template.md), with these sections in this order:

1. **Mission** — filled from analysis §1 (destination, not implementation).
2. **The bar** — acceptance criteria (§2) plus the reference bar (§3): what critics compare against, side by side, blind.
3. **Role split — hard boundary** — orchestrator never implements; Codex is sole implementer; critics are blind.
4. **The loop** — the 6-step cycle (contract → implement → blind audit → iterate via `task --resume-last` with fresh critics → adversarial second opinion on risky items → mark and log), bound to the bar. No arbitrary iteration cap.
5. **Codex delegation contract** — the XML block template from [references/delegation-contract.md](references/delegation-contract.md), with `<action_safety>` filled from analysis §5 and the STOP list in `<default_follow_through_policy>` filled from analysis §4.
6. **Critic contract** — from [references/critic-contract.md](references/critic-contract.md), bound to the bar.
7. **Fan-out map** — sequential gates and parallel surfaces from analysis §6.
8. **Progress ledger** — the orchestrator maintains a live `workbench.md` (or HTML page) with per-item status and verdicts, so a human can monitor without interrupting.
9. **Hard stops** — analysis §4 and §5, stated as outranking the loop.
10. **Definition of done** — every criterion critic-verified, repo checks green, a final smoothing pass over the integrated whole, plus every gate still awaiting a human listed.

After the code block, add at most three bullet points flagging gaps you found (missing acceptance criteria, ambiguous gates, derived assumptions). Nothing else — no restatement of the prompt, no execution offer.

## Quick reference

| Input | Action |
|---|---|
| `/gauntlet-loop build X to Y standard` | Inline objective → derive criteria, mark `DERIVED` |
| `/gauntlet-loop docs/plan.md` | Read file, extract gates/evidence verbatim |
| `/gauntlet-loop spec.html` | Read file, strip markup, then as above |
| No argument | Ask for the objective or file — only then |

## Common mistakes

- **Executing the plan instead of emitting the prompt.** The deliverable is text to copy/paste.
- **Letting the loop outrank human gates.** "Keep going until perfect" must never self-approve a sign-off; hard stops outrank persistence.
- **Summarized quality bars.** "High quality" is not a bar. Bind critics to the document's own checkboxes, numbers, and SLAs, and to concrete reference exemplars for subjective quality — a bar the agent cannot talk its way around.
- **Prescribing the implementation in the mission.** The mission states the destination; architecture belongs to the implementer.
- **Critics that see the implementer's summary.** Blind means artifacts + verbatim criteria only, and a fresh critic instance per retry.
- **Copying source-document secrets into the prompt.** Reference internal IDs/credentials by pointer, never by value, if the prompt may leave the private context.
