# repository-admin Specification

## Purpose

The repository-admin capability moves repository lifecycle into VS Code: today it is console-only, so users cannot create or delete a repository, copy its clone URL, or jump to the AWS console from the editor even though the tree already lists the repositories. This capability adds create/delete with strong confirmation, clone URL copy, console deep links, and metadata inspection.

## Requirements

### Requirement: Users can create repositories
The system SHALL create a CodeCommit repository from prompted name, description, and optional default branch.

#### Scenario: Create repository
- **WHEN** the user provides a valid name and optional description
- **THEN** the repository is created via `CreateRepository` and the view refreshes to include it

#### Scenario: Invalid or duplicate name
- **WHEN** CodeCommit rejects the name (invalid characters or already exists)
- **THEN** the error is reported clearly and the view state remains consistent

### Requirement: Users can delete repositories with strong confirmation
The system SHALL delete a repository only after an explicit typed confirmation.

#### Scenario: Delete repository
- **WHEN** the user confirms deletion by typing the repository name
- **THEN** the repository is deleted via `DeleteRepository` and the view refreshes

#### Scenario: Confirmation mismatch
- **WHEN** the typed name does not match
- **THEN** the deletion is aborted with no API call made

### Requirement: Users can copy clone URLs and open the AWS console
The system SHALL copy HTTPS and GRC clone URLs of a repository to the clipboard and open the region-aware console page for the repository.

#### Scenario: Copy clone URL
- **WHEN** the user runs a copy-clone-url command on a repository node
- **THEN** the requested URL format (HTTPS or GRC) is written to the clipboard and confirmed with an info message

#### Scenario: Open in console
- **WHEN** the user runs the console command on a repository node
- **THEN** the system browser opens the AWS console page for that repository in the configured region

### Requirement: Users can inspect repository metadata
The system SHALL display repository metadata such as ARN, account id, default branch, and clone URLs.

#### Scenario: View metadata
- **WHEN** the user runs the repository details command or hovers a repository node
- **THEN** the metadata from `GetRepository` is displayed with copyable clone URLs