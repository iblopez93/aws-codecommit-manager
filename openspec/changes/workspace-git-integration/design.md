## Context

The VS Code built-in git extension exposes `vscode.git` via `getExtension('vscode.git').exports.getAPI(1)` and offers repository state (remotes, state.HEAD) without spawning git. Current commands always resolve repository/branch from tree nodes or interactive quick picks (`src/commands/common.ts`). See proposal.md - Why.

## Goals / Non-Goals

**Goals:**

- Zero-configuration mapping from git remotes to CodeCommit repositories.
- Mapping-aware defaults that never remove the manual path.

**Non-Goals:**

- Clone/checkout operations (git-native workflows remain out of scope).
- Persisting mappings in settings — detection is live so renamed remotes keep working.
- Reading `~/.aws` or workspace secrets.

## Decisions

- **`vscode.git` API over spawning `git`**: works without a git binary in PATH and reacts to VS Code's own repo state. Fallback: if the git extension is unavailable, mapping returns empty and everything degrades to current behavior.
- **Remote URL parsing**: CodeCommit remotes use `https://git-codecommit.<region>.amazonaws.com/v1/repos/<name>` and the GRC variant; a small pure parser extracts region + repository name and is unit-testable without VS Code.
- **Mapping layer as a standalone module**: `workspaceMapping.ts` exposes `resolveMapping(uri)` returning `{ repositoryName, branchName?, region? } | undefined`; commands call it before prompts.
- **Preselect, never force**: quick picks receive the mapped value as preselected so the flow stays identical when the user overrides it.

## Risks / Trade-offs

- [git extension not activated yet at command time] → `activate()` the extension lazily and degrade gracefully.
- [SSH remotes to CodeCommit] → Also recognized (`ssh://git-codecommit.<region>...`); unrecognized URLs simply don't map.
- [Detached HEAD or unborn branch] → Branch context omitted; prompts proceed branch-agnostic.

## Migration Plan

Additive: new module + optional defaults in existing prompts. No data migration; rollback is removing the new module and contributions.

## Open Questions