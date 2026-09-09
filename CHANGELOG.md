# Change Log

All notable changes to the "aws-codecommit-manager" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## 0.0.1

- Initial release with an AWS CodeCommit Explorer view (repositories, branches,
  files, commits, and pull requests) built on the AWS SDK for JavaScript v3.
- AWS connection via the standard credential chain with configurable region and
  profile. No access keys are stored in VS Code settings.
- Branch operations: create, delete, set default, refresh.
- File operations: browse trees, open remote files read-only, upload, delete.
- Commit operations: create multi-file atomic commits from local workspace
  files and browse commit history.
- Pull request operations: create, update title/description, open/publish,
  close, and post/list review comments.
- Replaced the sample `helloWorld` command with functional commands.

## [Unreleased]

- Initial release