# AWS CodeCommit Manager

Manage and visualize AWS CodeCommit repositories, branches, files, commits, and
pull requests directly from VS Code using the AWS SDK for JavaScript (v3).

## Features

- **CodeCommit view** in the Explorer with repositories, branches, file trees,
  commit history, pull requests, and review comments.
- **Remote files** open in read-only editor tabs. Write operations always use
  explicit commands.
- **Branches**: create, delete, set default, and refresh.
- **Commits**: create a single atomic commit from one or more local workspace
  files on a selected branch.
- **Pull requests**: create, update title/description, open/publish, close, and
  post general review comments.
- **AWS connection**: standard credential chain with optional region and profile
  configuration. Access keys are never stored in VS Code settings.

## Requirements

- VS Code 1.136 or newer.
- Node.js 20 or newer for the extension host.
- An AWS account with **CodeCommit** enabled in the region you configure, and an
  IAM principal (user or role) allowed to list repositories and perform the
  operations you use.

## AWS Credentials

The extension reuses the standard AWS SDK credential chain:

1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
   `AWS_SESSION_TOKEN`).
2. Shared config/credentials files (`~/.aws/config`, `~/.aws/credentials`),
   including named profiles and SSO profiles.
3. Instance/container metadata on AWS hosts.

No access keys are stored in VS Code settings. If your machine already works
with the AWS CLI or AWS Toolkit, the extension picks up those credentials.

## Configuration

Run the **AWS CodeCommit: Configure AWS CodeCommit** command or set:

| Setting | Description |
| --- | --- |
| `aws-codecommit-manager.region` | AWS region for CodeCommit, e.g. `us-east-1`. Empty uses the SDK default resolution. |
| `aws-codecommit-manager.profile` | Named profile from the shared AWS files, e.g. `default`. |
| `aws-codecommit-manager.commitHistoryLimit` | Max commits loaded when expanding a branch history (default `100`). |

## Usage

- Open the **AWS CodeCommit** view in the Explorer. It loads the repositories
  for the configured region using your credentials.
- Expand a repository to see **Branches** and **Pull Requests**.
- Expand a branch to browse **Files** and **Commits**.
- Select a file node to open its remote content in a read-only tab.
- Right-click nodes to create/delete branches, set the default branch, upload or
  delete files, create commits from local files, create/update/open/close pull
  requests, and add review comments.
- Use the **Refresh** button in the view title bar to reload data.

### Creating a commit from local files

1. Open a workspace that contains the files you want to commit.
2. Run **AWS CodeCommit: Create Commit from Local Files** (available from a
   branch, Files, or folder node context menu).
3. Pick the files, enter a commit message, and select the target branch.
4. The extension uploads the changes as one atomic `CreateCommit` call against
   the branch tip and refreshes the view. If the branch tip moved, the
   operation fails with a clear message instead of silently overwriting.

## Supported Scope

- Repositories: listing and inspection only.
- Branches: create, delete, set default (`UpdateDefaultBranch`), inspect.
- Files: browse trees, open remote content read-only, upload (`PutFile`),
  delete (`DeleteFile`).
- Commits: inspect history, create multi-file commits (`CreateCommit`).
- Pull requests: list, create, update title/description, open/publish and close
  (`UpdatePullRequestStatus`), add general comments
  (`PostCommentForPullRequest`), and list comments.

### Known limitations

- CodeCommit has no generic "update branch" operation; only the default branch
  can be changed. Publish/close are implemented with the SDK's
  `UpdatePullRequestStatus`.
- Files open as read-only text documents. Git-native workflows (clone, branch
  checkout, local commits) are intentionally not replaced.
- Commit history is loaded up to `commitHistoryLimit` commits; use **Load More
  Commits** to continue.
- Inline (file/line) review comments, merge strategies, and approval rules are
  out of scope.
- Binary files display as a placeholder instead of raw content.

## Commands

| Command | Title |
| --- | --- |
| `aws-codecommit-manager.configure` | Configure AWS CodeCommit |
| `aws-codecommit-manager.refresh` | Refresh |
| `aws-codecommit-manager.openFile` | Open Remote File |
| `aws-codecommit-manager.createBranch` | Create Branch |
| `aws-codecommit-manager.deleteBranch` | Delete Branch |
| `aws-codecommit-manager.setDefaultBranch` | Set as Default Branch |
| `aws-codecommit-manager.putFile` | Upload File |
| `aws-codecommit-manager.deleteFile` | Delete Remote File |
| `aws-codecommit-manager.createCommit` | Create Commit from Local Files |
| `aws-codecommit-manager.createPullRequest` | Create Pull Request |
| `aws-codecommit-manager.updatePullRequestTitle` | Update Pull Request Title |
| `aws-codecommit-manager.updatePullRequestDescription` | Update Pull Request Description |
| `aws-codecommit-manager.publishPullRequest` | Open / Publish Pull Request |
| `aws-codecommit-manager.closePullRequest` | Close Pull Request |
| `aws-codecommit-manager.addPullRequestComment` | Add Review Comment |
| `aws-codecommit-manager.loadMoreCommits` | Load More Commits |

## Development

```text
npm run check-types   # TypeScript typecheck
npm run lint          # ESLint
npm run package       # Production bundle (esbuild)
npm test              # Tests in the VS Code test host
```

The AWS SDK client and credential providers are dependencies; the extension
reuses the SDK's Node.js HTTP handler and default credential provider chain.

**Enjoy!**
