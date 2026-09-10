## ADDED Requirements

### Requirement: Users can see the changed files of a pull request
The system SHALL list the file differences between the pull request source and destination refs under the pull request node.

#### Scenario: Expand a pull request
- **WHEN** the user expands a pull request node
- **THEN** the view lists the changed files returned by `GetDifferences` between the source and destination refs, with add/modify/delete status per file

#### Scenario: No differences
- **WHEN** the source and destination refs have no differences
- **THEN** the view shows an explicit no-changes placeholder instead of an empty section

### Requirement: Users can open diffs of pull request changes
The system SHALL open a diff editor for a changed file comparing the pull request source revision against the destination revision.

#### Scenario: Open a changed file diff
- **WHEN** the user selects a changed file node
- **THEN** a diff editor opens with the destination revision on the left and the source revision on the right

#### Scenario: Added or deleted file
- **WHEN** the changed file has no destination or source revision
- **THEN** the missing side renders as an empty document in the diff editor

### Requirement: Users can comment on files and lines
The system SHALL support review comments anchored to a file and optional line of a pull request, and SHALL display comment threads grouped by location.

#### Scenario: Add an inline comment
- **WHEN** the user adds a comment from a changed file node or from a diff editor command
- **THEN** the comment is posted with the file path and line via `PostCommentForPullRequest`

#### Scenario: View comment threads
- **WHEN** the user expands the comments of a pull request
- **THEN** comments are grouped by file and line, showing the thread content in order

### Requirement: Users can inspect pull request details in a panel
The system SHALL show a pull request details panel with metadata and the comment timeline when the user opens the details command.

#### Scenario: Open details panel
- **WHEN** the user runs the details command on a pull request node
- **THEN** a webview panel shows title, description, status, author, and the comment timeline

#### Scenario: Refresh from panel
- **WHEN** the PR data changes after a write operation
- **THEN** the open panel can be refreshed without closing and reopening it