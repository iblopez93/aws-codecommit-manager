## Context

The extension currently exposes remote files through `RemoteFileContentProvider` (`src/tree/remoteFileContentProvider.ts`), a `TextDocumentContentProvider` on the `codecommit-remote` scheme, which is inherently read-only. The service layer already has `putFile` (used by the "Create Commit from Local Files" flow) and `getBranch` for tip resolution. Tree nodes carry `repositoryName`, `branchName`, and file paths, and `RemoteFileUri` encodes them in the document URI. See proposal.md - Why for motivation.

## Goals / Non-Goals

**Goals:**

- Write-capable remote documents for branch-tip files using a `vscode.FileSystemProvider`.
- Conflict-safe saves: detect tip movement between open and save, never overwrite silently.
- Diff experiences: remote vs local workspace file, and same path across two branches.

**Non-Goals:**

- Multi-file staging, commit message flows on save (saves are single-file `PutFile`).
- Editing or merging binary files.
- Replacing git-native clone/checkout workflows (unchanged stance from the README).

## Decisions

- **FileSystemProvider over content provider**: `vscode.FileSystemProvider` is the only supported mechanism for writable custom schemes, and it keeps the existing URI scheme. Alternative (a separate "edit in scratch buffer + upload" command) was rejected because it loses rename/undo/search integration of real documents.
- **Tip guard via open-time commit id**: capture the tip commit id when a document is first read; on save compare against the current tip and pass it as `parentCommitId`. Alternative (optimistic save, report error after) was rejected because users need the choice to compare before overwriting.
- **Diff via `vscode.diff` with synthetic URIs**: remote sides reuse `codecommit-remote` URIs; local sides use the workspace file. A `QuickPick` resolves the local file when the active editor is not a match.
- **Save as explicit command contribution**: keep `Ctrl+S` working through the provider's `writeFile`, and also contribute a "Save to CodeCommit" command so the flow is discoverable from menus.

## Risks / Trade-offs

- [Provider migration breaks existing open-file behavior] → Preserve the `RemoteFileUri` format and keep existing tests passing; add read-path regression tests before switching the write path on.
- [Large files make diffs slow (full `GetFile` on both sides)] → Accept; CodeCommit files in this flow are workspace-scale, and the existing history-limit settings show the pattern of explicit user control.
- [Concurrent edits from two editors of the same revision] → Both saves go through the same tip guard; the second save reports the conflict and re-checks the tip.

## Migration Plan

1. Add `FileSystemProvider` behind the same scheme and switch registration in `extension.ts`.
2. Add save and diff commands plus menus.
3. Rollback is a revert of the provider registration; document URIs are compatible so no user data migration is needed.

## Open Questions