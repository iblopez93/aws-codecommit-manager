# extension-help Specification

## Purpose

The extension-help capability removes the friction first-time users hit: the welcome view only links three commands, credential errors surface as bare messages without recovery actions, and there is no diagnostic log, so support and self-troubleshooting both start from zero context. This capability adds a guided walkthrough, actionable error notifications, structured diagnostics, and a status bar help menu.

## Requirements

### Requirement: Users get a Getting Started walkthrough
The system SHALL provide a walkthrough that guides the user from configuration to the first pull request.

#### Scenario: Walkthrough listed
- **WHEN** the user opens the Welcome page or the extension's welcome view
- **THEN** a "Getting Started with AWS CodeCommit" walkthrough is listed with steps for configure, login, browsing, committing, and creating a pull request

#### Scenario: Step completion
- **WHEN** the user completes the action of a step (for example, a successful login)
- **THEN** the corresponding walkthrough step is marked as done

### Requirement: Errors offer recovery actions
The system SHALL present credential, network, and configuration errors as notifications with recovery actions matching the error kind.

#### Scenario: Credential error
- **WHEN** an operation fails because credentials are missing or invalid
- **THEN** the notification offers Login and Configure actions that start the corresponding flows when selected

#### Scenario: Network or region error
- **WHEN** an operation fails with a network or region error
- **THEN** the notification offers Open Settings, Show Logs, and Retry, and Retry re-runs the failed operation

### Requirement: Diagnostics are logged to an output channel
The system SHALL write structured diagnostic logs to an "AWS CodeCommit" output channel without logging secrets.

#### Scenario: Operations are logged
- **WHEN** a service operation succeeds or fails
- **THEN** a line with timestamp, operation, and outcome is appended to the output channel, with credentials and tokens redacted

#### Scenario: Show Logs action
- **WHEN** the user selects Show Logs from a notification or command
- **THEN** the AWS CodeCommit output channel is opened and focused

### Requirement: The connected status bar item offers a help menu
The system SHALL open a quick menu from the status bar item when connected instead of always starting the login flow.

#### Scenario: Menu while connected
- **WHEN** the user clicks the connected status bar item
- **THEN** a quick pick offers Refresh, Configure, Show Logs, and Open in AWS Console, and runs the chosen action

#### Scenario: Disconnected behavior
- **WHEN** the status bar shows the disconnected state
- **THEN** clicking it starts the login flow as today