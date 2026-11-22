# Issue tracker

Use GitHub Issues in `Votok/pokuk-next` for specs, tickets, and triage.
Select `Votok/pokuk-next` explicitly in every GitHub connector call or
`gh` command. Use `--repo Votok/pokuk-next` with `gh issue` and
`gh label`, and explicit `repos/Votok/pokuk-next/...` paths with `gh api`.

- To publish a spec or ticket, create an issue in this repository.
- To fetch a ticket, read its body, comments, labels, and dependencies.
- Link child tickets as native sub-issues and track blockers with native
  issue dependencies. If unavailable, use `Part of #<parent>` or
  `Blocked by: #<issue>` in the issue body.
- Use the configured triage labels. When closing an issue, post the
  explanation before closing it.
- For wayfinding, use a `wayfinder:map` issue with typed child tickets.
  Start with an unassigned child whose blockers are closed. Record its
  outcome in the map when resolving it.

**PRs as a request surface: no.**
