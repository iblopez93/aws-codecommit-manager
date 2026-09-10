## Context

Repositories are read-only today: listing via `ListRepositories` and inspection via `GetRepository` are mapped in `src/domain/mappers.ts`, and commands follow the guarded pattern in `src/commands/registerCommands.ts` (destructive actions already prompt for confirmation, e.g. delete branch/file). See proposal.md - Why.

## Goals / Non-Goals

**Goals:**

- Lifecycle actions consistent with the existing delete-branch/delete-file guard patterns.
- Region-aware console deep links derived from the configured region.

**Non-Goals:**

- Repository tagging, notification-rule setup, or triggers (out of CodeCommit-manager scope).
- Local clone execution (git workflows remain out of scope; we copy URLs only).

## Decisions

- **Typed-name confirmation for delete**: reuse the destructive-command guard but require the repository name to be typed, mirroring AWS console behavior for an irreversible action; nothing is called until the text matches exactly.
- **Clone URLs from `GetRepository`**: use the SDK-provided `cloneUrlHttp`/`cloneUrlSsh` when present and derive the GRC form (`https://<account-id>.git-codecommit.<region>.amazonaws.com/...`) as a fallback; derive the console URL from the configured region without another API call.
- **Metadata as hover + details command**: hover tooltip carries name/ARN/default branch; the details command offers a quick pick with copyable entries (cheap, no webview needed).

## Risks / Trade-offs

- [Accidental repository deletion] → Typed confirmation + destructive guard; deletion is never triggered by a single click or keyboard-only path.
- [GRC URL derivation may not match special setups] → Prefer SDK-provided values; derived URLs are labeled as fallback.
- [Console URL format drift] → Build from the documented console path pattern and log the opened URL for diagnosis.

## Migration Plan

Additive commands and service methods; no settings or data migration. Rollback is a revert of the new module and contributions.

## Open Questions