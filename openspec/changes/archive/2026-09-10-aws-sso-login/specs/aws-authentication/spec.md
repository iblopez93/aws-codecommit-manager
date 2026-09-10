## Purpose

Provides interactive AWS authentication following the AWS Toolkit standard, including an interactive SSO login flow via IAM Identity Center and a status bar showing connection state.

## ADDED Requirements

### Requirement: Status bar shows connection state
The system SHALL display a status bar item in the VS Code explorer view indicating whether the extension is connected to AWS or disconnected.

#### Scenario: Disconnected state
- **WHEN** no valid AWS credentials are available
- **THEN** the status bar shows a plug icon with "AWS CodeCommit: Disconnected" text

#### Scenario: Connected state
- **WHEN** valid AWS credentials are resolved through any provider
- **THEN** the status bar shows a check icon with "AWS CodeCommit: Connected (profile-name)" text

### Requirement: Interactive SSO login command
The system SHALL provide an `aws-codecommit-manager.login` command that initiates the IAM Identity Center SSO flow.

#### Scenario: User invokes login command
- **WHEN** the user runs `AWS CodeCommit: Login` from the command palette
- **THEN** the system prompts for the IAM Identity Center start URL (e.g., https://d-abc123.awsapps.com/start)

#### Scenario: User cancels login prompt
- **WHEN** the user dismisses the start URL prompt
- **THEN** no authentication attempt occurs and the status remains disconnected

### Requirement: Device Authorization Grant flow
The system SHALL perform OAuth 2.0 Device Authorization Grant (RFC 8628) for SSO login.

#### Scenario: Device authorization initiated
- **WHEN** the user provides a valid start URL
- **THEN** the system registers an OIDC client and starts device authorization, receiving a user code and verification URL

#### Scenario: Browser opens for user verification
- **WHEN** device authorization is initiated
- **THEN** the system opens the verification URL in the system browser and displays the user code in an information message

#### Scenario: Token polling until approval
- **WHEN** the browser is open waiting for user approval
- **THEN** the system polls the token endpoint at the specified interval until the user approves or the code expires

#### Scenario: Token received and cached
- **WHEN** the user approves the authorization in the browser
- **THEN** the system receives the access token and caches it in `~/.aws/sso/cache/` using the standard AWS SSO cache format

#### Scenario: Authorization timeout
- **WHEN** the device code expires before user approval
- **THEN** the system displays an error message indicating the login timed out and the user may retry

#### Scenario: Authorization denied
- **WHEN** the user denies the authorization in the browser
- **THEN** the system displays an error message indicating the authorization was denied

### Requirement: SSO profile creation
The system SHALL create or update a named profile in `~/.aws/config` for the SSO session after successful login.

#### Scenario: Profile created after login
- **WHEN** SSO login completes successfully
- **THEN** the system writes a profile section to `~/.aws/config` containing `sso_start_url`, `sso_region`, `sso_account_id`, and `sso_role_name`

#### Scenario: Profile uses user-provided name
- **WHEN** the login completes
- **THEN** the user is prompted for a profile name to use for the SSO session

### Requirement: SSO credential resolution
The system SHALL use cached SSO credentials when an SSO profile is active, falling back to the default provider chain otherwise.

#### Scenario: SSO profile is active
- **WHEN** a profile with SSO configuration is the active profile
- **THEN** the system resolves credentials using `fromSSO` from `@aws-sdk/credential-providers`

#### Scenario: No SSO profile configured
- **WHEN** no SSO profile is configured or the active profile uses IAM credentials
- **THEN** the system resolves credentials using the default provider chain (environment variables, shared credentials, instance metadata)

### Requirement: Status bar updates after login
The system SHALL update the status bar to reflect the new connection state after a successful or failed login.

#### Scenario: Status updates after successful login
- **WHEN** SSO login completes successfully
- **THEN** the status bar changes to connected state showing the active profile name

#### Scenario: Status remains disconnected after failed login
- **WHEN** SSO login fails for any reason
- **THEN** the status bar remains in disconnected state
