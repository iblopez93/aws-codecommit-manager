## 1. Dependencies and Configuration

- [x] 1.1 Add `@aws-sdk/client-sso` and `@aws-sdk/client-sso-oidc` to package.json dependencies and verify `npm install` completes
- [x] 1.2 Add `aws-codecommit-manager.login` command to package.json contributes.commands with icon `$(plug)` and title "Login"
- [x] 1.3 Update `viewsWelcome` content to include a Login command link alongside Configure and Refresh

## 2. SSO Authentication Flow

- [x] 2.1 Implement `src/aws/sso.ts` with `registerClient`, `startDeviceAuthorization`, `pollForToken`, and `cacheToken` functions following RFC 8628 device authorization grant
- [x] 2.2 Implement `createSsoProfile` function that writes `[profile <name>]` section to `~/.aws/config` with sso_start_url, sso_region, sso_account_id, and sso_role_name
- [x] 2.3 Implement `loginCommand` in `src/commands/configure.ts` that prompts for start URL, account ID, role name, and profile name; orchestrates the full SSO flow; and calls `reloadService` on success

## 3. Status Bar

- [x] 3.1 Implement `src/ui/statusBar.ts` with `createStatusBar` function that creates a StatusBarAlignment.Left item showing connection state with plug/check icon
- [x] 3.2 Implement `updateStatusBar` function that queries credential state and updates the status bar text and icon
- [x] 3.3 Wire status bar click to invoke the login command

## 4. Credential Resolution

- [x] 4.1 Modify `src/aws/config.ts` to add optional `ssoProfile` field to `AwsSettings` interface
- [x] 4.2 Modify `src/aws/client.ts` to use `fromSSO` from `@aws-sdk/credential-providers` when `ssoProfile` is set, otherwise fall back to default provider chain
- [x] 4.3 Implement `isConnected` helper that attempts to resolve credentials and returns boolean indicating connection state

## 5. Extension Integration

- [x] 5.1 Modify `src/extension.ts` to create the status bar item on activation and register it in subscriptions
- [x] 5.2 Modify `src/commands/registerCommands.ts` to register `aws-codecommit-manager.login` command with the guarded wrapper
- [x] 5.3 Call `updateStatusBar` after successful login and after `reloadService`

## 6. Testing and Validation

- [x] 6.1 Add unit tests for pure helpers (token cache path computation, profile config formatting) and verify they pass
- [x] 6.2 Run `npm run check-types`, `npm run lint`, `npm run package`, and `npm test`; verify all pass
- [x] 6.3 Run `openspec validate --change aws-sso-login` and verify change is valid
