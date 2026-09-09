## Context

The extension is a TypeScript VS Code extension with a bundled Node.js entry point. The current repository contains only a sample command and no AWS SDK dependencies. The implementation must preserve the existing VS Code extension packaging model while adding AWS CodeCommit behavior.

## Goals / Non-Goals

**Goals:**

- Provide a practical CodeCommit workflow inside VS Code.
- Support the most frequently used repository, branch, file, commit, and pull request operations.
- Use AWS SDK v3 clients and the standard AWS credential chain.
- Keep user-visible behavior testable and errors actionable.

**Non-Goals:**

- Do not implement every historical CodeCommit API endpoint.
- Do not replace local Git integration or perform local branch checkout.
- Do not store AWS access keys in VS Code settings.
- Do not provide full GitHub-style pull request review threading or approval workflows.

## Decisions

- **Use AWS SDK for JavaScript v3**: The CodeCommit client and credential providers are maintained by AWS and fit the Node.js extension host without adding a custom REST signer.
- **Use the standard AWS credential chain**: This supports environment variables, shared AWS config profiles, SSO configured in AWS Toolkit, and other SDK-supported providers without storing secrets in extension settings.
- **Use a tree provider for discovery and inspection**: The Explorer-style view mirrors common GitHub-style repository browsing while keeping commands available from context menus and the command palette.
- **Use remote file open for inspection**: File nodes open remote file content in VS Code editor tabs, while write operations use explicit commands to avoid accidental remote edits.
- **Build commits from a remote tree snapshot**: For multi-file commits, the extension fetches the parent tree, updates file blob entries, and creates a commit with the resulting tree ID.
- **Separate services from UI**: AWS clients, domain helpers, tree providers, and command handlers are separated so pure logic can be tested without launching AWS services.

## Risks / Trade-offs

[Risk] CodeCommit API pagination and large file trees can make browsing slow. → Mitigation: use paginated clients, limit UI batches where practical, and show progress indicators.
[Risk] Credential failures can be difficult to diagnose. → Mitigation: surface AWS error code, message, and configured region/profile in user-facing messages.
[Risk] Remote file edits can conflict with other collaborators. → Mitigation: require explicit commands and refresh before write operations.
[Risk] Multi-file commit tree construction can fail if the remote tree changes. → Mitigation: use the selected branch tip as the parent commit and report conflict/update errors clearly.
[Risk] Pull request review features are smaller than GitHub. → Mitigation: document the supported subset and keep the UI scoped to CodeCommit-native operations.

## Migration Plan

1. Add AWS SDK dependencies and update extension metadata.
2. Replace the sample command with CodeCommit activation, configuration, and tree registration.
3. Add repository, branch, file, commit, and pull request services.
4. Add user commands and tree context actions.
5. Update README and run typecheck, lint, package, and tests.
6. Roll back by reinstalling the previous extension version if a released build causes issues.

## Open Questions

- None that block implementation. Regional availability, IAM permissions, and actual AWS account access will be validated by the user during manual testing.
