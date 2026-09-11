## 1. Mapping layer

- [x] 1.1 Implement a pure CodeCommit remote URL parser (HTTPS and GRC forms) extracting region and repository name; verify unit tests for both URL shapes and non-CodeCommit URLs
- [x] 1.2 Implement `workspaceMapping.resolveMapping(uri)` using the `vscode.git` API with lazy activation and graceful fallback; verify mapping resolves for a simulated repository

## 2. Open and compare active file

- [x] 2.1 Add the "Open Current File in CodeCommit" command using the active editor's relative path and the mapped branch; verify the remote file opens for the mapped repo
- [x] 2.2 Add the "Compare with CodeCommit" command opening a diff with the remote revision and an empty side for missing paths; verify both existing-path and new-path diffs
- [x] 2.3 Report unmapped/untracked files with explicit messages; verify unit tests cover the no-mapping path

## 3. Mapping-aware defaults

- [x] 3.1 Preselect mapped repository and branch in the commit flow prompts; verify the prompts arrive preselected and remain changeable
- [x] 3.2 Default the PR source branch to the mapped branch; verify the target branch is still prompted
- [x] 3.3 Handle ambiguous multi-folder mappings with a folder-disambiguation quick pick; verify the pick shows folder names

## 4. Contributions and validation

- [x] 4.1 Register the new commands with editor and SCM context menus in `package.json`; verify `npm run check-types` and `npm run lint` pass
- [x] 4.2 Add integration tests for mapping resolution against the git API mock; verify `npm test` passes