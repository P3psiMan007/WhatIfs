# What If Explains — Shared Episode State Protocol

Single source of truth: `episodes/current/episode-state.json`

## Ownership

- **Growth Intelligence** owns `growth.*` and may create a new episode only from `IDLE` or `ANALYZED`.
- **Episode Factory** owns `production.*` and production states.
- **Critic + Analytics** owns `qa.*`, `analytics.*`, and voice selection.
- **User** is the only publication authority.

## State machine

`IDLE -> SELECTED -> RESEARCHED -> SCRIPTED -> VOICE_AUDITIONS_READY -> VOICE_SELECTED -> VOICE_READY -> RENDERED -> QA_PASSED_AWAITING_USER_APPROVAL -> PUBLISHED -> ANALYZED`

Allowed block/reject branches include `RESEARCH_BLOCKED`, `VOICE_BLOCKED`, `QA_FAILED_VOICE`, and `QA_FAILED`.

## Concurrency rules

1. Every write increments `state_revision` by exactly 1.
2. Writers must supply the revision they read.
3. If the on-disk revision changed, abort rather than overwrite.
4. Never update an `episode_id` that differs from the one read.
5. Every write appends a compact history record.
6. If this file is accessible, automations must use it rather than memory.
7. If it is inaccessible, NOOP rather than inventing state.

## Publication rule

No automation may publish. `QA_PASSED_AWAITING_USER_APPROVAL` is the highest autonomous state.
