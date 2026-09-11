# workspace-integration Specification

## Purpose

The workspace-integration capability bridges the workspace and CodeCommit: the extension treats them as separate worlds, forcing users to manually re-enter repository and branch for every operation even when the open workspace is a clone whose git remote already points to CodeCommit. This capability turns workspace context into sensible defaults and one-click actions.

## Requirements

### Requirement: The system maps workspace folders to CodeCommit repositories
The system SHALL detect git remotes in workspace folders that point to CodeCommit and resolve them to repository and branch context.

#### Scenario: CodeCommit remote detected
- **WHEN** a workspace folder has a git remote referencing a CodeCommit repository
- **THEN** the system maps the folder to that repository and uses its current local branch as the branch context

#### Scenario: No CodeCommit remote
- **WHEN** no workspace folder has a CodeCommit remote
- **THEN** commands fall back to the existing interactive repository/branch prompts without errors

#### Scenario: Ambiguous remotes
- **WHEN** multiple workspace folders map to different repositories
- **THEN** the system asks which mapping to use with the folder name shown

### Requirement: Users can open the active file from CodeCommit
The system SHALL open the CodeCommit revision of the active editor file at the mapped branch.

#### Scenario: Open active file remotely
- **WHEN** the user runs the open command from an editor with a file inside a mapped workspace folder
- **THEN** the remote file opens for the mapped repository and branch, using the file's relative path

#### Scenario: File outside the mapping
- **WHEN** the active file is not inside a mapped folder
- **THEN** the system reports that no CodeCommit mapping applies and does not guess a repository

### Requirement: Users can compare local files with CodeCommit
The system SHALL diff the active editor file against its CodeCommit revision at the mapped branch.

#### Scenario: Compare active file
- **WHEN** the user runs the compare command in a mapped workspace
- **THEN** a diff editor opens with the local file and the remote revision of the same path

#### Scenario: Remote path does not exist
- **WHEN** the file has no remote counterpart on the branch
- **THEN** the diff opens with an empty remote side and the title marks it as new

### Requirement: Workspace mapping preselects repository and branch
The system SHALL use the workspace mapping as the default repository and branch selection for commit and pull request commands started from the mapped context.

#### Scenario: Commit from mapped folder
- **WHEN** the user starts a commit from a mapped workspace folder
- **THEN** the repository and branch prompts are preselected with the mapping and remain changeable

#### Scenario: Pull request from mapped folder
- **WHEN** the user starts a pull request from a mapped workspace folder
- **THEN** the source branch defaults to the mapped branch and the target branch is asked as today