## Why

Teams that work with AWS CodeCommit currently have to switch between the AWS console, AWS CLI, and VS Code to inspect repositories, branches, files, commits, and pull requests. This interrupts development and makes CodeCommit feel less integrated than GitHub-based workflows. This change brings a native VS Code surface for the important CodeCommit operations so developers can review and manage work without leaving the editor.

## What Changes

- Add a CodeCommit view in the VS Code Explorer with repositories, branches, files, commits, and pull requests.
- Support repository discovery and inspection for the configured AWS account and region.
- Support reading file contents, browsing commit history, and viewing pull request details and comments.
- Support creating, updating, deleting, and checking branches.
- Support creating, updating, publishing, and closing pull requests, including review comments.
- Support creating commits from selected local files with an interactive commit message.
- Reuse the standard AWS credential chain and allow explicit region and profile selection.
- Replace the sample `helloWorld` command with functional CodeCommit commands.
- Add tests for pure logic and integration-oriented extension behavior where feasible.

## Capabilities

### New Capabilities

- `codecommit-manager`: Query, visualize, and manage AWS CodeCommit repositories, branches, files, commits, and pull requests from VS Code.

### Modified Capabilities

- None. The repository has no existing CodeCommit-specific capability requirements.

## Impact

- `src/extension.ts`: extension activation and command registration.
- `src/`: new modules for AWS clients, domain types, tree providers, commands, and helpers.
- `package.json` and `package-lock.json`: new dependencies, commands, configuration, and icon contributions.
- `README.md`: installation, authentication, usage, and scope documentation.
- AWS SDK for JavaScript v3: CodeCommit client and AWS credential providers.
