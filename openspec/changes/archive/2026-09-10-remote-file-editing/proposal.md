## Why

Remote CodeCommit files open as read-only tabs, so users must switch to the AWS console or the CLI to fix a typo, and they cannot compare remote content against local workspace files. In-editor editing and diffing removes that round trip and closes the biggest usability gap reported in the Known Limitations of the README.

## What Changes

- Replace the read-only content provider path with a `vscode.FileSystemProvider` that supports both read and write for files at a branch tip; file revisions tied to a commit specifier stay read-only.
- Save-to-CodeCommit flow: saving an editable remote document uploads the change with `PutFile` against the branch tip, guarded against a stale tip (conflict detection with `parentCommitId`).
- New commands: **Compare Remote File with Local File**, **Compare File Across Branches** (diff editor between two branch revisions of the same path), and **Save to CodeCommit**.
- Tree contributions and context menus for the new actions on file and branch nodes.

## Capabilities

### New Capabilities

- `remote-file-editing`: editing, saving, and diffing remote CodeCommit files from VS Code editors, including conflict-safe saves at the branch tip.

### Modified Capabilities

## Impact

- `src/tree/remoteFileContentProvider.ts`: migrates from `TextDocumentContentProvider` to `vscode.FileSystemProvider` (read + write capabilities); URI format is preserved.
- `src/services/awsCodeCommitService.ts` / `src/services/codeCommitService.ts`: reuse the existing `putFile`; add a branch-tip change check for the save flow.
- `src/commands/files.ts`: new compare and save commands; `package.json`: new command contributions, menus, and `codecommit-remote` document scheme behavior.
- No new dependencies; no settings changes.