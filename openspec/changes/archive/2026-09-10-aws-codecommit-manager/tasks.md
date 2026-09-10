## 1. Planning Artifacts

- [x] 1.1 Create proposal, capability spec, design, and task artifacts for the CodeCommit manager and verify OpenSpec status reports planning completion
- [x] 1.2 Verify the documented scope matches the implemented command surface

## 2. Dependencies and Extension Metadata

- [x] 2.1 Add AWS SDK v3 CodeCommit and credential provider dependencies and verify `npm install` updates the lockfile
- [x] 2.2 Update package metadata with activation events, commands, configuration, and CodeCommit view contributions
- [x] 2.3 Remove the sample helloWorld command contribution and verify command registration no longer exposes it

## 3. AWS Client and Domain Layer

- [x] 3.1 Implement AWS client creation from VS Code settings and the standard credential chain, and verify typechecking passes
- [x] 3.2 Implement domain types and helpers for repository, branch, file, commit, pull request, and error normalization
- [x] 3.3 Add unit tests for pure helpers and verify `npm run check-types` passes

## 4. Tree View and Repository Browsing

- [x] 4.1 Implement the CodeCommit tree provider for repositories, branches, files, commits, and pull requests
- [x] 4.2 Implement repository listing, branch listing, file tree traversal, file content loading, and commit history loading
- [x] 4.3 Add refresh and repository inspection commands and verify they are available from the command palette

## 5. Branch and File Management

- [x] 5.1 Implement branch create/delete commands and verify they call the CodeCommit branch APIs
- [x] 5.2 Implement file upload/delete commands and verify they call the CodeCommit file APIs
- [x] 5.3 Implement remote file opening and verify file nodes open content in VS Code editor tabs

## 6. Commit Management

- [x] 6.1 Implement selected-file commit creation by fetching the parent tree, updating file blobs, and creating the commit
- [x] 6.2 Add commit message and target branch prompts and verify commit creation refreshes branch history
- [x] 6.3 Add error handling for missing branches, conflicts, and AWS service failures

## 7. Pull Request Management

- [x] 7.1 Implement pull request list/create/update/publish/close/comment commands
- [x] 7.2 Display pull request details and comments in the tree view
- [x] 7.3 Add confirmation prompts for publish, close, and delete operations

## 8. Documentation and Validation

- [x] 8.1 Update README with installation, AWS credential setup, configuration, commands, and supported scope
- [x] 8.2 Run `npm run check-types`, `npm run lint`, `npm run package`, and `npm test`; record any environment-limited manual validation
- [x] 8.3 Review final Git diff and verify all edited files are present and working as expected
