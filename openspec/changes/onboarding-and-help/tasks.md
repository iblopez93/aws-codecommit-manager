## 1. Diagnostics

- [x] 1.1 Create `src/ui/log.ts` with a redacting output channel wrapper and register the "AWS CodeCommit" channel in `extension.ts`; verify unit tests cover credential redaction
- [x] 1.2 Add the "Show Logs" command and log lines from service operations (operation, outcome, duration); verify log lines appear for success and failure

## 2. Actionable errors

- [x] 2.1 Implement `showAppError` with the kind-to-action mapping (Login/Configure, Open Settings/Show Logs, Retry); verify unit tests cover every mapped kind
- [x] 2.2 Replace direct `showErrorMessage` call sites in command handlers, passing retry closures for transient kinds; verify a credential failure offers Login and the action starts the login flow

## 3. Status bar menu

- [x] 3.1 Add the `statusBarMenu` command with Refresh/Configure/Show Logs/Open in AWS Console options and switch the status bar command by connection state; verify the menu opens when connected and login starts when disconnected

## 4. Walkthrough

- [x] 4.1 Add the `walkthroughs` contribution with the five steps (configure, login, browse, commit, PR) and command links; verify the walkthrough appears on the Welcome page
- [x] 4.2 Wire step completion to existing flows (settings write, successful login, commit/PR commands); verify steps complete after performing the actions

## 5. Validation

- [x] 5.1 Update the welcome view links to include Show Logs and the walkthrough; verify `npm run check-types`, `npm run lint`, and `npm test` pass