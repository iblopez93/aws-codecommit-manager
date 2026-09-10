## Why

Pull request review currently lists only general comments in the tree: reviewers cannot see which files a PR changes, cannot open a diff of those changes, and cannot anchor comments to a file or line. That makes the view unusable for real review work and pushes users back to the AWS console.

## What Changes

- Show the changed-file list of a pull request (`GetDifferences` between source and destination refs) under the PR node.
- Open a diff editor for any changed file in the PR (source revision vs destination revision).
- Support file/line anchored review comments (`PostCommentForPullRequest` with location) and threaded display of comments per file.
- Add a PR details webview panel with title, description, status, author, and comment timeline, opened from the PR node.

## Capabilities

### New Capabilities

- `pull-request-review`: reviewing pull request changes in VS Code, including changed-file listing, diff viewing, and file/line anchored comment threads.

### Modified Capabilities

## Impact

- `src/services/awsCodeCommitService.ts` / `src/services/codeCommitService.ts`: add `getPullRequestDifferences` (`GetDifferences`), location-based `postCommentForPullRequest`, and batched `GetCommentsForPullRequest` mapping.
- `src/tree/codeCommitTreeProvider.ts` / `src/tree/nodes.ts`: new `changedFile` node kind and comment-thread grouping.
- `src/commands/pullRequests.ts`: new diff and inline-comment commands; new webview panel module.
- `package.json`: new commands and menus; no new dependencies.