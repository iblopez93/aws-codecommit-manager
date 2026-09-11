## Why

First-time users have no guided path: the welcome view only links three commands, credential errors surface as bare messages without recovery actions, and there is no diagnostic log, so support and self-troubleshooting both start from zero context.

## What Changes

- Add a **Getting Started** walkthrough (`walkthroughs` contribution) with steps for configure, login, browsing, committing, and opening a PR.
- Turn credential/network/region errors into actionable notifications: buttons for Login, Configure, Open Settings, Show Logs, and Retry where relevant.
- Add an "AWS CodeCommit" output channel with structured, redacted logging and a Show Logs action.
- Make the connected status bar item open a quick menu (Refresh, Configure, Show Logs, Open Console) instead of always invoking login.

## Capabilities

### New Capabilities

- `extension-help`: onboarding, actionable error recovery, diagnostics, and status-bar help surface of the extension.

### Modified Capabilities

## Impact

- `package.json`: `walkthroughs` and `viewsWelcome` contributions, welcome-page assets under a new `resources/` folder.
- New `src/ui/errors.ts` (actionable error presentation), `src/ui/log.ts` (output channel), `src/ui/statusBar.ts` (menu), `src/commands/registerCommands.ts` (menu command).
- `src/domain/errors.ts`: unchanged shape; the presentation layer maps `AppError.kind` to actions.
- No new dependencies.