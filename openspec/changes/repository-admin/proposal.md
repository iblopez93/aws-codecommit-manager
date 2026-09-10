## Why

Repository lifecycle is console-only today: users cannot create or delete a repository, copy its clone URL, or jump to the AWS console from VS Code, even though the tree already lists the repositories.

## What Changes

- New commands: **Create Repository** (name, description, optional default branch), **Delete Repository** (typed-name double confirmation), **Copy Clone URL** (HTTPS and GRC variants), and **Open in AWS Console** (region-aware deep link).
- Repository metadata (ARN, account id, default branch, clone URLs) shown via a details quick pick / hover in the tree.
- Context menus on repository nodes for all new actions, with the destructive delete gated behind confirmation.

## Capabilities

### New Capabilities

- `repository-admin`: repository lifecycle and convenience actions (create, delete, clone URLs, console links, metadata display).

### Modified Capabilities

## Impact

- `src/services/awsCodeCommitService.ts` / `src/services/codeCommitService.ts`: add `createRepository`, `deleteRepository`, richer metadata mapping from `ListRepositories`/`GetRepository`.
- `src/commands/repositories.ts` (new command module), `src/tree/codeCommitTreeProvider.ts` (metadata display).
- `package.json`: commands, repository-node menus.
- No new dependencies; delete/create operations reuse the existing guarded-command wrapper.