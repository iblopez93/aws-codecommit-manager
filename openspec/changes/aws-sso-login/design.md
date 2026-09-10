## Context

See proposal.md - Why. The extension currently resolves AWS credentials through the SDK default provider chain based on `region` and `profile` settings. There is no interactive authentication flow. The AWS Toolkit for VS Code is the reference implementation for IAM Identity Center SSO login in VS Code extensions.

## Goals / Non-Goals

**Goals:**
- Add status bar item showing connected/disconnected state with active profile name
- Implement OAuth 2.0 Device Authorization Grant (RFC 8628) for IAM Identity Center SSO
- Cache tokens in standard AWS SSO cache format at `~/.aws/sso/cache/`
- Create named SSO profiles in `~/.aws/config`
- Integrate with `@aws-sdk/credential-providers#fromSSO` for credential resolution
- Update `viewsWelcome` content to include a Login button when disconnected

**Non-Goals:**
- Multi-profile switching UI (Level C) — out of scope for this change
- IAM credential management (access key creation/rotation) — not needed for SSO users
- Automatic token refresh before expiration — SDK handles refresh transparently
- AWS Builder ID support — would require additional OIDC flow

## Decisions

### Decision 1: SSO SDK choice
Use `@aws-sdk/client-sso-oidc` for the device authorization flow (RegisterClient, StartDeviceAuthorization, CreateToken operations).

**Alternatives considered:**
- `@aws-sdk/credential-providers#fromSSO` alone — handles credential resolution but NOT the interactive login flow (no device auth)
- Manual HTTP implementation — reinventing the wheel, error-prone

**Rationale:** The device authorization grant requires explicit OIDC client operations that only `client-sso-oidc` provides. `fromSSO` handles resolution of cached tokens but cannot initiate a new session.

### Decision 2: Token caching location
Cache tokens in `~/.aws/sso/cache/<sha1(startUrl)>.json` using the standard AWS SSO cache format.

**Alternatives considered:**
- VS Code SecretStorage — would break interoperability with AWS CLI and other tools
- Custom cache location — would require additional configuration

**Rationale:** Using the standard cache location ensures compatibility with the AWS CLI and other SDK-based tools. The cache format matches what `fromSSO` expects.

### Decision 3: SSO profile creation
After successful login, prompt for a profile name and write a `[profile <name>]` section to `~/.aws/config` with `sso_start_url`, `sso_region`, `sso_account_id`, and `sso_role_name`.

**Alternatives considered:**
- Auto-generate profile name from start URL — less user-friendly
- Require user to configure profile manually in `~/.aws/config` — defeats the purpose of interactive login

**Rationale:** Prompting for a profile name gives users control while automating the SSO configuration details.

### Decision 4: Status bar design
Use `vscode.window.createStatusBarItem` with `alignment: StatusBarAlignment.Left` and a priority that places it near other AWS-related items. Click behavior invokes the login command.

**Alternatives considered:**
- Using `vscode.window.onDidChangeStatusBarMessage` — not applicable
- Tree view welcome content only — less visible than status bar

**Rationale:** Status bar provides persistent visibility and is the standard AWS Toolkit pattern.

## Risks / Trade-offs

- **Browser dependency** → Mitigation: Display the user code and URL in an information message so users can manually navigate if browser auto-open fails
- **`~/.aws/config` write permissions** → Mitigation: Wrap in try/catch and show clear error if file is not writable
- **Token cache directory may not exist** → Mitigation: Create `~/.aws/sso/cache/` directory if missing before writing
- **SSO requires account ID and role name** → Mitigation: After device authorization, prompt user for account ID and role name to complete profile configuration

## Migration Plan

No migration needed. This is additive — existing region/profile settings continue to work as fallback when no SSO profile is active.

## Open Questions

- None — all design decisions are resolvable with the chosen SDK and standard AWS SSO patterns.
