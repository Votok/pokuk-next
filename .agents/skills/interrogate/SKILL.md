---
name: interrogate
description: Stress-test a change or design and report failures confirmed by running a check.
---

# Interrogate

Read the [Codex workflow notes](../references/pstack-codex.md#adversarial-review).

1. Use the requested scope. If none is given, find the branch's base and review from the merge base through the working tree. Restate the intended behavior in your own words using the request, issue, and relevant changes. Ask when the intent or base is ambiguous.
2. Review from distinct perspectives based on the scope. For each plausible failure, run a focused test, repro script, or command against the actual code. For a design, run a small prototype or probe the current system. Record the exact command, observed result, and expected result. Keep scratch work outside the user's workspace changes.
3. Rerun each reported reproduction. Keep a finding only if its output demonstrates a failure against the stated intent. Merge findings with the same root cause.
4. Report the intent, each verified finding with its command and output, and any checks you could not run. Say “no verified findings” if none survive. Leave fixes to a separate task.
