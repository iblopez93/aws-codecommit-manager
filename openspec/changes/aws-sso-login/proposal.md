## Why

The extension currently requires manual configuration of region and profile through VS Code settings.json, with no interactive way to authenticate against AWS. Users familiar with the AWS Toolkit expect a one-click SSO login flow that opens a browser for IAM Identity Center authentication. This change adds standard AWS authentication UX: a status bar showing connection state and an interactive SSO login command.

## What Changes

- Add a status bar item in the VS Code explorer showing connected/disconnected state with the active profile
- Add `aws-codecommit-manager.login` command that prompts for the IAM Identity Center start URL and performs OAuth 2.0 Device Authorization Grant flow
- Cache SSO tokens in `~/.aws/sso/cache/` and create SSO profiles in `~/.aws/config`
- Use `@aws-sdk/credential-providers#fromSSO` when an SSO profile is active, falling back to the default provider chain otherwise
- New dependencies: `@aws-sdk/client-sso` and `@aws-sdk/client-sso-oidc`

## Capabilities

### New Capabilities
- `aws-authentication`: Interactive AWS SSO login with IAM Identity Center, status bar connection state, and credential lifecycle management

### Modified Capabilities
- *None* — existing tree browsing and repository management behavior is unchanged when credentials are valid

## Impact

- **New dependencies**: `@aws-sdk/client-sso`, `@aws-sdk/client-sso-oidc`
- **New files**: `src/aws/sso.ts`, `src/ui/statusBar.ts`
- **Modified files**: `src/aws/config.ts` (add ssoProfile), `src/aws/client.ts` (SSO credential resolution), `src/commands/configure.ts` (login command), `src/commands/registerCommands.ts` (register login), `src/extension.ts` (status bar init), `package.json` (deps + command)
- **External systems**: Opens system browser for OAuth device flow, writes to `~/.aws/sso/cache/` and `~/.aws/config`
- **Breaking**: None — existing profile/region settings still work as fallback
