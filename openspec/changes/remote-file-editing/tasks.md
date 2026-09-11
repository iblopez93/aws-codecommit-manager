## 1. File system provider

- [x] 1.1 Replace `TextDocumentContentProvider` with a `vscode.FileSystemProvider` implementing read/write on the `codecommit-remote` scheme and register it in `extension.ts`; verify existing open-file tests and open-read-only flows pass
- [x] 1.2 Capture and cache the branch-tip commit id at first read per document URI; add unit tests for the tip cache keyed by URI

## 2. Save flow

- [x] 2.1 Implement `writeFile` to call `PutFile` against the branch tip inside `withProgress`, then refresh the branch tree; verify a save uploads content and refreshes the view
- [x] 2.2 Implement the tip guard comparing open-time and save-time commit ids, passing `parentCommitId` on `PutFile`; verify unit tests cover unchanged and moved-tip cases
- [x] 2.3 Add the moved-tip conflict dialog with explicit overwrite and compare-first options; verify the dialog reports the conflict and keeps editor content
- [x] 2.4 Block saving for documents tied to a commit specifier and verify a read-only save attempt shows the explanation

## 3. Diff commands

- [x] 3.1 Add the "Compare Remote File with Local File" command resolving the local side from the active editor or a workspace file QuickPick; verify the diff editor opens both sides
- [x] 3.2 Add the "Compare File Across Branches" command with a two-step branch picker; verify the diff opens the same path from both branches
- [x] 3.3 Report missing local files and binary mismatch cases with clear messages; verify unit tests cover the missing-file path

## 4. Contributions and metadata

- [x] 4.1 Add command contributions, context menus for file and branch nodes, and keyboard-discoverable titles in `package.json`; verify `npm run check-types` and `npm run lint` pass
- [x] 4.2 Add integration tests for open-edit-save against the provider and verify `npm test` passes