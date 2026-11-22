---
name: architect
description: Compare two architecture sketches before implementation and keep the approved design aligned with the code.
---

# Architect

Read the [Codex workflow notes](../references/pstack-codex.md#architecture-comparison) and follow the repository's AGENTS.md.

1. Trace each affected system and its callers. Record the current data flow and which module owns each piece of state.
2. Sketch two distinct designs. Include types, signatures, module boundaries, and how each design meets the agreed acceptance criteria. For a large or contested design, use the comparison in the workflow notes.
3. Recommend the design with clear state ownership, one path for each operation, and the smallest burden on callers. Explain the tradeoffs. When the user asks for design only, stop at the sketch and recommendation. Obtain the maintainer's explicit approval for significant architecture decisions and record approved decisions in the project's ADR directory before implementation.
4. During authorized implementation, compare each completed unit with the approved sketch and rationale. Record proposed deviations and unresolved disagreements. Update the sketch when the decision owner accepts a deviation and record who accepted it.
