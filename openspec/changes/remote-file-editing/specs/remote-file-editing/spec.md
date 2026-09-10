## ADDED Requirements

### Requirement: Users can edit remote files and save them to CodeCommit
The system SHALL open CodeCommit files at a branch tip in editable tabs and upload saved changes to CodeCommit with `PutFile`.

#### Scenario: Editable remote document
- **WHEN** the user opens a file at a branch tip from the CodeCommit view
- **THEN** the document opens in an editable tab backed by the `codecommit-remote` file system provider

#### Scenario: Save uploads the change
- **WHEN** the user saves an editable remote document
- **THEN** the system calls `PutFile` against the branch tip, shows a progress notification, and refreshes the file tree

#### Scenario: Old revisions stay read-only
- **WHEN** the user opens a file revision tied to a commit specifier
- **THEN** the document opens read-only and save attempts are blocked with an explanation

### Requirement: Saves are guarded against a moved branch tip
The system SHALL detect branch-tip movement between open and save and SHALL NOT overwrite remote changes silently.

#### Scenario: Tip moved since open
- **WHEN** the branch tip changed between the document being opened and saved
- **THEN** the system reports the conflict, keeps the editor content, and offers to overwrite explicitly or compare first

### Requirement: Users can compare remote files against local and other revisions
The system SHALL present diffs between a remote file and a local workspace file, and between two branch revisions of the same path.

#### Scenario: Compare with local file
- **WHEN** the user runs the compare command from a remote file node
- **THEN** a diff editor opens with the selected local workspace file on one side and the remote branch revision on the other

#### Scenario: Compare across branches
- **WHEN** the user runs the branch-compare command from a file or branch node
- **THEN** a diff editor opens the same path resolved from two branches picked by the user

#### Scenario: Local file missing
- **WHEN** no matching local file exists in the workspace
- **THEN** the system reports the missing local file and does not open an empty diff