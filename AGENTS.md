# Instructions for AI Agents

## General Principles
- Prioritize correctness, security, maintainability and minimal changes.
- Follow the existing architecture, conventions and project structure.
- Prefer simple, targeted solutions over broad refactorings.
- Do not invent APIs, requirements or configuration options.
- Verify assumptions against the actual codebase and installed dependencies.

## Context Efficiency
- Inspect only files relevant to the current task.
- Do not recursively scan the entire repository without a specific reason.
- Avoid generated files, build output, caches, logs and dependency directories
  such as `vendor/` and `node_modules/` unless directly necessary.
- Prefer configuration and lockfiles to determine versions and capabilities.
- Avoid redundant file reads, tool calls and repeated analysis.
- Combine related investigation, implementation and validation into one
  focused task.

## Implementation
- Identify the root cause before fixing a bug.
- Make the smallest change that correctly solves the problem.
- Avoid unrelated changes, unnecessary abstractions and new dependencies.
- Preserve existing behavior and compatibility unless explicitly instructed
  otherwise.
- Follow established patterns instead of introducing new conventions.
- Ask for clarification only when missing information materially affects
  the solution or could cause significant unintended changes.

## Safety and Git
- Preserve unrelated user changes.
- Never discard existing work, reset the repository or rewrite Git history
  without explicit authorization.
- Do not expose secrets or weaken security controls.
- Avoid destructive operations and irreversible changes without authorization.
- Do not modify generated files when the underlying source can be changed.

## Validation
- Run the narrowest relevant tests and checks available.
- Avoid repeating successful checks without a specific reason.
- Do not modify tests merely to hide implementation defects.
- Never claim that a test, command or validation succeeded unless it was
  actually executed successfully.

## Final Response
- Briefly summarize the objective, changes and validation results.
- Mention relevant assumptions, risks or unresolved issues.
- Keep explanations concise and focus on actionable information.
