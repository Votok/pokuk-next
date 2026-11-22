# Codex workflow notes

Matt Pocock's workflow is primary. Use these two skills on explicit request through the Codex skill picker as `$architect` and `$interrogate`. The project issue governs scope and acceptance criteria, and AGENTS.md governs approvals and delivery.

## Architecture comparison

Adapted from upstream Arena phases A and D. Use the same problem statement and constraints for both sketches. Write 3–6 criteria tied to the agreed scope, such as clear state ownership, a small caller-facing API, and compatibility with existing data. Score both sketches against each criterion. Carry over a strength from the other sketch only if it fits the recommended design. State any unresolved tradeoffs and how the design could be verified.

## Adversarial review

Adapted from upstream Arena phases A, B, and F and the intent restatement from `in-your-own-words`. Use the same scope and intent for every pass. Work sequentially in the active Codex session. Pick distinct angles relevant to the change, such as legacy inputs, ownership and state transitions, or partial failures. Use available local execution tools to test each hypothesis and rerun each reproduction. If tools or data prevent a check, report that gap with the result.

## Compatibility

Upstream's Codex mapping supports a sequential fallback when agent fan-out is unavailable. This installation uses that fallback for both workflows. A single session can compare designs and verify failures, but cannot supply independent reviewers or model diversity. For checks that require scratch files or modifications, use a disposable directory and respect the workspace sandbox. Use Codex's existing tools and active session model. No model override sheet, Claude model aliases, or session-log effort helper is required.
