## Why

The extension treats the workspace and CodeCommit as separate worlds: users must manually re-enter the repository and branch for every operation, even when the open workspace is a clone whose git remote already points to CodeCommit. Bridging the two turns the workspace context into sensible defaults and one-click actions.

## What Changes

- Detect CodeCommit remotes in the workspace's git configuration (via the VS Code git extension API) and map workspace folders to CodeCommit repositories and branches.
- New commands: **Open Current File in CodeCommit** (active editor file → remote revision), **Compare with CodeCommit** (local vs remote diff), and context-aware commit that preselects the mapped repository and branch.
- Surface the mapping in the tree (auto-expand/badge the mapped repository) and use it as default for commit and PR commands started from SCM context.

## Capabilities

### New Capabilities

- `workspace-integration`: mapping local workspace folders to CodeCommit repositories and branches, and reusing that mapping across commands.

### Modified Capabilities

## Impact

- New module `src/aws/workspaceMapping.ts`: git-extension based remote detection and folder↔repository resolution.
- `src/commands/files.ts`, `src/commands/pullRequests.ts`: mapping-aware defaults in prompts and quick picks.
- `package.json`: new commands and editor/SCM menu contributions.
- No new npm dependencies (uses the built-in `vscode.git` extension API).