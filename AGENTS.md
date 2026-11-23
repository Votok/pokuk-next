# Pokuk Next

## Project goals

- Migrate the legacy ASP.NET photo gallery to Next.js App Router and reuse
  the existing Azure Blob Storage data.
- Use the migration to learn React and Next.js, especially React Server
  Components, server-side data fetching, and Server Actions.
- Prefer Server Components by default. Use Client Components where
  interactivity requires them. Preserve opportunities to use Server Actions
  where appropriate. Evaluate deployment options for low recurring Azure
  costs while preserving server capabilities. Do not optimize exclusively
  for static export.
- Migrate the .NET uploader to a Node.js and TypeScript CLI in a later phase.
- Use strict TypeScript, automated tests, CI, and code review.

## Working agreement

- Leave a blank line between functions and methods. In longer functions,
  separate distinct steps with a blank line.
- Follow spec-driven development. Agree on scope and acceptance criteria in
  a GitHub issue before implementing it. Work from that spec and verify the
  result against it.
- Get the maintainer’s explicit approval before implementing significant
  architecture decisions. Record approved decisions in `docs/adr/`.
- Use Matt Pocock’s `teach` skill during implementation to explain relevant
  React and Next.js concepts in the context of the work.
- Treat `../pokuk/pokuk-web`, `../pokuk/pokuk-common`, and
  `../pokuk/pokuk-upload` as read-only reference sources.

## Agent skills

### Issue tracker

Use GitHub Issues for `Votok/pokuk-next` exclusively. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

Use the single-context layout. See `docs/agents/domain.md`.
