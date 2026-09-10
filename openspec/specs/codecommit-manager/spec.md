# codecommit-manager Specification

## Purpose

The CodeCommit manager capability gives VS Code users a focused workspace for discovering AWS CodeCommit repositories and performing the repository, branch, file, commit, and pull request operations they use most often.

## Requirements

### Requirement: Users can discover and inspect repositories
The system SHALL allow an authenticated user to list CodeCommit repositories for the configured AWS region and inspect repository metadata.

#### Scenario: List repositories
- **WHEN** the user opens the CodeCommit view or refreshes it
- **THEN** the view displays all repositories returned by CodeCommit for the configured region

#### Scenario: Repository access fails
- **WHEN** CodeCommit returns an authorization, region, or network error
- **THEN** the view shows a clear error message and does not leave stale repository data appearing current

### Requirement: Users can browse repository branches, files, and commits
The system SHALL allow an authenticated user to list branches, browse files on a branch, and inspect commit history for a branch.

#### Scenario: Browse files on a branch
- **WHEN** the user expands a branch in the CodeCommit view
- **THEN** the view displays the repository file tree for that branch

#### Scenario: Open a remote file
- **WHEN** the user selects a file node
- **THEN** VS Code opens the file content in an editable editor tab

#### Scenario: Inspect commit history
- **WHEN** the user expands the commits section for a branch
- **THEN** the view displays commits returned by CodeCommit for that branch

### Requirement: Users can manage branches
The system SHALL allow an authenticated user to create, delete, and refresh branches in a repository.

#### Scenario: Create branch
- **WHEN** the user creates a branch from an existing branch
- **THEN** CodeCommit creates the branch and the view refreshes to show the new branch

#### Scenario: Delete branch
- **WHEN** the user deletes a branch
- **THEN** CodeCommit deletes the branch and the view refreshes after confirmation

### Requirement: Users can create commits from selected local files
The system SHALL allow an authenticated user to create a commit in a repository branch from selected local workspace files.

#### Scenario: Create commit from selected files
- **WHEN** the user selects local files and creates a commit
- **THEN** the extension uploads file changes, builds the remote tree, creates a commit on the selected branch, and refreshes the branch commit history

#### Scenario: Create commit with missing branch
- **WHEN** the selected branch no longer exists or cannot be updated
- **THEN** the extension reports the CodeCommit error and does not claim the commit was created

### Requirement: Users can manage pull requests and review comments
The system SHALL allow an authenticated user to list, create, update, publish, close, and comment on pull requests.

#### Scenario: Create pull request
- **WHEN** the user creates a pull request from a source branch to a target branch
- **THEN** CodeCommit creates the pull request and the view displays it in the repository pull request section

#### Scenario: Publish or close pull request
- **WHEN** the user publishes or closes a pull request
- **THEN** CodeCommit updates the pull request state and the view refreshes

#### Scenario: Add review comment
- **WHEN** the user adds a review comment to a pull request
- **THEN** CodeCommit stores the comment and the pull request comments section refreshes

### Requirement: Users can configure AWS connection settings
The system SHALL allow the user to configure the AWS region and optional profile used by the extension.

#### Scenario: Configure region and profile
- **WHEN** the user runs the configure command
- **THEN** the extension stores the selected region and optional profile in VS Code settings

#### Scenario: Use default AWS credentials
- **WHEN** no profile is configured
- **THEN** the extension uses the standard AWS SDK credential chain for the configured region