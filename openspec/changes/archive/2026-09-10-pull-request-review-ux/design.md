## Context

Pull requests are currently rendered as tree nodes with general comments (`PostCommentForPullRequest` without location, `GetCommentsForPullRequest` flattened in `src/domain/mappers.ts`). The tree provider (`src/tree/codeCommitTreeProvider.ts`) supports grouping nodes per repository section. See proposal.md - Why.

## Goals / Non-Goals

**Goals:**

- Review-grade visibility: changed files, per-file diffs, located comments.
- One webview panel per PR, consistent with VS Code webview patterns (CSP-compliant, no inline scripts).

**Non-Goals:**

- Approval-rule management (`EvaluatePullRequestApprovalRules` writes) — read-only display may come later.
- Merge execution or merge-strategy selection.
- Comment editing or deletion (CodeCommit API limits replies to posted threads).

## Decisions

- **`GetDifferences` between refs, not per-commit walk**: the PR source/dest pull-request object already carries the commit ids; a single `GetDifferences` call is cheaper and mirrors what the console shows.
- **Diff sides from `GetBlob` on the PR commits**: fetch each side's blob by commit + path and open with two `codecommit-remote` style URIs pinned to commit specifiers; empty side when the file is added/deleted.
- **Comments grouped in the tree by `filePath:line`**: reuse the existing comments group; inline comment command takes the parent node's location. The webview shows the same flattened threads as a timeline.
- **Single reusable webview panel module**: one panel per PR id, created on demand and revealed if already open; serialization is not needed for the initial scope.

## Risks / Trade-offs

- [Changed-file listing can be large for wide PRs] → Cap the list with the existing "load more" pattern used for commits if `GetDifferences` exceeds one page.
- [Diff fetches two blobs per file] → Fetch lazily on node selection; never prefetch all files of a PR.
- [Webview XSS from PR text] → Escape all remote text in the panel template; strict CSP with `default-src 'none'`.

## Migration Plan

Additive change: new node kind, new commands, new panel. Existing PR tree behavior is preserved; rollback is a revert of the new module and contributions.

## Open Questions