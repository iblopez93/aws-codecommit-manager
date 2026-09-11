## 1. Service layer

- [x] 1.1 Add `getPullRequestDifferences` mapping `GetDifferences` between the PR source and destination commits into domain objects with change type; verify unit tests for the mapper
- [x] 1.2 Extend `postCommentForPullRequest` to accept an optional file/line location and add a mapper for located comment threads; verify unit tests cover located and general comments

## 2. Changed files in the tree

- [x] 2.1 Add a `changedFile` tree node kind and list changed files when expanding a pull request, with the no-changes placeholder; verify the tree renders the list
- [x] 2.2 Cap large difference lists with the existing load-more pattern if pagination applies; verify the cap behaves like the commits section

## 3. Diffs and inline comments

- [x] 3.1 Implement the changed-file diff command opening `vscode.diff` with destination vs source revisions, including empty-side handling for added/deleted files; verify the diff opens for each change type
- [x] 3.2 Add the inline-comment command from changed-file nodes and diff editors, posting the file/line location; verify a comment posted from a node carries the location
- [x] 3.3 Group comment threads by file and line in the comments section; verify grouping for multiple locations

## 4. Details panel

- [x] 4.1 Create the reusable webview panel module with a CSP-safe template rendering PR metadata and the comment timeline; verify the panel opens from a PR node
- [x] 4.2 Add panel refresh on write operations and verify the open panel updates without being recreated

## 5. Contributions and validation

- [x] 5.1 Register commands, menus for pullRequest and changedFile nodes in `package.json`; verify `npm run check-types` and `npm run lint` pass
- [x] 5.2 Add integration tests for the tree grouping and mapper changes; verify `npm test` passes