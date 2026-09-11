/**
 * Shared helpers for command handlers: repository/branch resolution from tree
 * nodes, progress windows, and post-write refresh helpers.
 */
import * as vscode from 'vscode';

import { AppError } from '../domain/errors';
import { buildKeepOrChangeItems } from '../integration/mappingDefaults';
import { resolveWorkspaceMapping } from '../integration/workspaceMapping';
import { CodeCommitService } from '../services/codeCommitService';
import { getTreeProvider } from '../state';
import { TreeNode } from '../tree/nodes';
import { CancelledError, pickBranch } from './prompts';

/** Wraps an operation in a notification progress window. */
export async function withProgress<T>(title: string, action: () => Promise<T>): Promise<T> {
	return vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title }, action);
}

/**
 * Picks a repository interactively. When a mapped repository is provided and
 * exists, it is offered first as the workspace default but stays changeable.
 */
export async function pickRepository(service: CodeCommitService, preferred?: string): Promise<string | undefined> {
	const repositories = await service.listRepositories();
	const names = repositories.map((repository) => repository.name);
	const items =
		preferred !== undefined && names.includes(preferred)
			? buildKeepOrChangeItems(preferred, names, (name) => name)
			: names.map((name) => ({ label: name, value: name }));
	const picked = await vscode.window.showQuickPick(items, { title: 'Select a repository' });
	return picked?.value;
}

/** Resolves the repository name from a tree node or interactively. */
export async function requireRepositoryName(
	service: CodeCommitService,
	node?: TreeNode
): Promise<string> {
	switch (node?.kind) {
		case 'repository':
			return node.repository.name;
		case 'branchesGroup':
		case 'branch':
		case 'filesGroup':
		case 'folder':
		case 'file':
		case 'commitsGroup':
		case 'loadMoreCommits':
		case 'pullRequestsGroup':
		case 'pullRequest':
		case 'commentsGroup':
		case 'comment':
			return node.repositoryName;
		default: {
			const mapping = await resolveWorkspaceMapping().catch(() => undefined);
			const name = await pickRepository(service, mapping?.repositoryName);
			if (!name) {
				throw new CancelledError();
			}
			return name;
		}
	}
}

/** Resolves the branch name from a tree node or interactively. */
export async function requireBranchName(
	service: CodeCommitService,
	repositoryName: string,
	node?: TreeNode
): Promise<string> {
	switch (node?.kind) {
		case 'branch':
			return node.branch.name;
		case 'filesGroup':
		case 'folder':
		case 'file':
		case 'commitsGroup':
		case 'loadMoreCommits':
			return node.branchName;
		default: {
			// Preselect the mapped branch when it belongs to this repository.
			const mapping = await resolveWorkspaceMapping().catch(() => undefined);
			const preferred = mapping?.repositoryName === repositoryName ? mapping.branchName : undefined;
			const branchName = await pickBranch(service, repositoryName, 'Select a branch', undefined, preferred);
			if (!branchName) {
				throw new CancelledError();
			}
			return branchName;
		}
	}
}

/** Fetches the current tip commit id of a branch. */
export async function requireBranchTip(
	service: CodeCommitService,
	repositoryName: string,
	branchName: string
): Promise<string> {
	const branch = await service.getBranch(repositoryName, branchName);
	if (!branch.commitId) {
		throw new AppError(`Branch '${branchName}' has no tip commit.`, { kind: 'codecommit' });
	}
	return branch.commitId;
}

/** Refreshes the tree at the branch level after a write operation. */
export function refreshBranch(repositoryName: string, branchName: string): void {
	getTreeProvider().refresh({
		kind: 'branch',
		repositoryName,
		branch: { name: branchName },
	});
}

/** Refreshes the pull requests group of a repository. */
export function refreshPullRequests(repositoryName: string): void {
	getTreeProvider().refresh({
		kind: 'pullRequestsGroup',
		repositoryName,
	});
}