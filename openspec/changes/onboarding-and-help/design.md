## Context

Errors are currently surfaced as plain `showErrorMessage` strings built from `AppError` (`src/domain/errors.ts`, `formatAppError`), the status bar always invokes `login` (`src/ui/statusBar.ts`), and onboarding is a three-link `viewsWelcome` block. See proposal.md - Why.

## Goals / Non-Goals

**Goals:**

- Recovery actions mapped deterministically from `AppError.kind`.
- A single output channel used by every service call.
- Zero-dependency walkthrough using VS Code's `walkthroughs` contribution.

**Non-Goals:**

- Telemetry or analytics reporting.
- A separate help webview (walkthrough + menus cover the need).
- Changing the credential error kinds themselves.

## Decisions

- **Central `showAppError(error, { retry? })` helper**: replaces scattered `showErrorMessage` calls so action mapping lives in one place; commands pass an optional retry closure for transient kinds (network, throttling).
- **Kind-to-action mapping table**: `credentials → Login/Configure`, `network → Show Logs/Retry`, `region/config → Open Settings/Show Logs`; unknown kinds keep the message-only behavior.
- **Output channel wrapper (`src/ui/log.ts`)**: `info/warn/error(operation, detail)` lines with a redaction step that scrubs `SecretAccessKey`, `sessionToken`, and SSO cache values before writing.
- **Status bar menu via QuickPick command**: a new internal `statusBarMenu` command; the item's `command` is switched dynamically between `login` (disconnected) and `statusBarMenu` (connected).
- **Walkthrough checkboxes**: steps use the standard `walkthroughs` contribution with command links; completion is driven by existing operations (configure writes settings, login succeeds, commit/PR commands run).

## Risks / Trade-offs

- [Log volume in long sessions] → Cap by design: one line per operation, no payload dumps; debug-level detail only behind an opt-in setting if ever needed.
- [Redaction gaps] → Redact by key-name pattern before serialization and add unit tests over sample AWS error payloads.
- [Walkthrough step-check complexity] → Steps map to existing commands only; no new instrumentation beyond marking existing flows complete.

## Migration Plan

Additive UI layer; commands switch from `showErrorMessage(formatAppError(...))` to the helper mechanically. Rollback: revert the helper call sites.

## Open Questions