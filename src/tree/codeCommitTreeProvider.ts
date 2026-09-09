/**
 * Tree data provider for the AWS CodeCommit explorer view. The tree is loaded
 * lazily: repositories are fetched once, and branches/files/commits/pull request
 * details are fetched on expansion with caches for commit history.
 */
import * as vscode from 'vscode';

import { getAwsSettings } from '../aws/config';
import { CodeCommitService } from '../services/codeCommitService';
import { formatAppError, normalizeError } from '../domain/errors';
import { compactArn, shortId } from '../domain/mappers';
import { basename, dirname } from '../domain/paths';
import { CommitInfo, PullRequestInfo } from '../domain/types';
import { contextValueOf, nodeId, TreeNode } from './nodes';
import { RemoteFileUri } from './remoteFileContentProvider';

/** Cached commit history state for one branch. */
interface CommitHistoryState {
	commits: CommitInfo[];
}

function commitHistoryKey(repositoryName: string, branchName: string): string {
	return `${repositoryName}\u0000${branchName}`;
}

/** Resolves the branch name from branch-like nodes. */
function branchNameOf(element: { kind: 'branch'; branch: { name: string } } | { kind: 'commitsGroup'; branchName: string } | { kind: 'loadMoreCommits'; branchName: string }): string {
	return element.kind === 'branch' ? element.branch.name : element.branchName;
}

function icon(id: string): vscode.ThemeIcon {
	return new vscode.ThemeIcon(id);
}

/** Tree data provider for the `aws-codecommit-manager.view` view. */
export class CodeCommitTreeProvider implements vscode.TreeDataProvider<TreeNode> {
	private readonly _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	private readonly commitHistory = new Map<string, CommitHistoryState>();
	private service: CodeCommitService;

	constructor(service: CodeCommitService) {
		this.service = service;
	}

	/** Swaps in a new service (after settings changes) without losing the view. */
	updateService(service: CodeCommitService): void {
		this.service = service;
		this.commitHistory.clear();
		this.refresh();
	}

	/** Clears caches and fires a change event for the given element (or root). */
	refresh(element?: TreeNode): void {
		if (element === undefined) {
			this.commitHistory.clear();
		} else if (element.kind === 'branch' || element.kind === 'commitsGroup' || element.kind === 'loadMoreCommits') {
			this.commitHistory.delete(commitHistoryKey(element.repositoryName, branchNameOf(element)));
		}
		this._onDidChangeTreeData.fire(element);
	}

	/** Grows the cached history by one commit batch and refreshes the group. */
	async loadMoreCommits(node: TreeNode): Promise<void> {
		if (node.kind !== 'loadMoreCommits') {
			return;
		}
		const key = commitHistoryKey(node.repositoryName, node.branchName);
		const state = this.commitHistory.get(key);
		if (!state || state.commits.length === 0) {
			this.refresh({ kind: 'commitsGroup', repositoryName: node.repositoryName, branchName: node.branchName });
			return;
		}
		const last = state.commits[state.commits.length - 1];
		if (last.parents.length === 0) {
			this.refresh({ kind: 'commitsGroup', repositoryName: node.repositoryName, branchName: node.branchName });
			return;
		}
		const limit = getAwsSettings().commitHistoryLimit;
		const more = await this.service.listCommits(node.repositoryName, last.parents[0], limit);
		state.commits.push(...more);
		this._onDidChangeTreeData.fire({
			kind: 'commitsGroup',
			repositoryName: node.repositoryName,
			branchName: node.branchName,
		});
	}

	getTreeItem(element: TreeNode): vscode.TreeItem {
		const item = new vscode.TreeItem(elementLabel(element));
		item.id = nodeId(element);
		item.contextValue = contextValueOf(element);
		switch (element.kind) {
			case 'root':
				item.iconPath = icon('source-control');
				item.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
				break;
			case 'repository':
				item.tooltip = element.repository.name;
				item.iconPath = icon('repo');
				item.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
				break;
			case 'branchesGroup':
				item.iconPath = icon('git-branch');
				item.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
				break;
			case 'branch':
				item.tooltip = element.branch.name;
				item.description = element.branch.commitId ? shortId(element.branch.commitId) : undefined;
				item.iconPath = icon('git-branch');
				item.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
				break;
			case 'filesGroup':
				item.iconPath = icon('files');
				item.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
				break;
			case 'folder':
				item.description = dirname(element.path);
				item.iconPath = icon('folder');
				item.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
				break;
			case 'file':
				item.description = dirname(element.entry.path);
				item.iconPath = icon('file');
				item.collapsibleState = vscode.TreeItemCollapsibleState.None;
				item.command = {
					command: 'aws-codecommit-manager.openFile',
					title: 'Open Remote File',
					arguments: [element],
				};
				break;
			case 'commitsGroup':
				item.iconPath = icon('git-commit');
				item.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
				break;
			case 'commit': {
				const firstLine = (element.commit.message ?? '').split('\n')[0];
				item.description = truncate(firstLine, 60);
				item.tooltip = buildCommitTooltip(element.commit);
				item.iconPath = icon('git-commit');
				item.collapsibleState = vscode.TreeItemCollapsibleState.None;
				break;
			}
			case 'loadMoreCommits':
				item.iconPath = icon('refresh');
				item.collapsibleState = vscode.TreeItemCollapsibleState.None;
				break;
			case 'pullRequestsGroup':
				item.iconPath = icon('git-pull-request');
				item.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
				break;
			case 'pullRequest':
				item.tooltip = buildPullRequestTooltip(element.pullRequest);
				item.description = element.pullRequest.status;
				item.iconPath = icon('git-pull-request');
				item.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
				break;
			case 'commentsGroup':
				item.iconPath = icon('comment');
				item.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
				break;
			case 'comment':
				item.label = truncate((element.comment.content ?? '').split('\n')[0], 60);
				item.description = compactArn(element.comment.authorArn);
				item.tooltip = buildCommentTooltip(element.comment);
				item.iconPath = icon('comment');
				item.collapsibleState = vscode.TreeItemCollapsibleState.None;
				break;
			case 'error':
				item.tooltip = element.message;
				item.description = element.message;
				item.iconPath = icon('error');
				item.collapsibleState = vscode.TreeItemCollapsibleState.None;
				break;
		}
		return item;
	}

	getChildren(element?: TreeNode): vscode.ProviderResult<TreeNode[]> {
		if (element === undefined || element.kind === 'root') {
			return this.loadChildren(() => loadRootChildren(this.service));
		}
		switch (element.kind) {
			case 'repository':
				return this.loadChildren(() => loadRepositoryChildren(this.service, element));
			case 'branchesGroup':
				return this.loadChildren(() => loadBranchesGroupChildren(this.service, element));
			case 'branch':
				return this.loadChildren(() => loadBranchChildren(this.service, element));
			case 'filesGroup':
				return this.loadChildren(() => loadFilesGroupChildren(this.service, element));
			case 'folder':
				return this.loadChildren(() => loadFolderChildren(this.service, element));
			case 'commitsGroup':
				return this.loadChildren(() => loadCommitsGroupChildren(this.service, element, this.commitHistory));
			case 'pullRequestsGroup':
				return this.loadChildren(() => loadPullRequestsGroupChildren(this.service, element));
			case 'pullRequest':
				return this.loadChildren(() => loadPullRequestChildren(this.service, element));
			case 'commentsGroup':
				return this.loadChildren(() => loadCommentsGroupChildren(this.service, element));
			case 'file':
			case 'commit':
			case 'loadMoreCommits':
			case 'comment':
			case 'error':
				return [];
		}
	}

	private async loadChildren(action: () => Promise<TreeNode[]>): Promise<TreeNode[]> {
		try {
			return await action();
		} catch (error) {
			const appError = normalizeError(error, { region: this.service.region, profile: this.service.profile });
			return [{ kind: 'error', message: formatAppError(appError) }];
		}
	}

	getParent(element: TreeNode): vscode.ProviderResult<TreeNode> {
		switch (element.kind) {
			case 'root':
				return null;
			case 'repository':
				return { kind: 'root' };
			case 'branchesGroup':
			case 'pullRequestsGroup':
				return { kind: 'repository', repository: { name: element.repositoryName } };
			case 'branch':
				return { kind: 'branchesGroup', repositoryName: element.repositoryName };
			case 'filesGroup':
			case 'commitsGroup':
				return { kind: 'branch', repositoryName: element.repositoryName, branch: { name: element.branchName } };
			case 'folder':
			case 'file':
				return { kind: 'filesGroup', repositoryName: element.repositoryName, branchName: element.branchName };
			case 'commit':
			case 'loadMoreCommits':
				return { kind: 'commitsGroup', repositoryName: element.repositoryName, branchName: element.branchName };
			case 'pullRequest':
				return { kind: 'pullRequestsGroup', repositoryName: element.repositoryName };
			case 'commentsGroup':
				return {
					kind: 'pullRequest',
					repositoryName: element.repositoryName,
					pullRequest: element.pullRequest,
				};
			case 'comment':
				return {
					kind: 'commentsGroup',
					repositoryName: element.repositoryName,
					pullRequest: element.pullRequest,
				};
			case 'error':
				return null;
		}
	}
}

function elementLabel(element: TreeNode): string {
	switch (element.kind) {
		case 'root':
			return 'AWS CodeCommit';
		case 'repository':
			return element.repository.name;
		case 'branchesGroup':
			return 'Branches';
		case 'branch':
			return element.branch.name;
		case 'filesGroup':
			return 'Files';
		case 'folder':
			return basename(element.path);
		case 'file':
			return basename(element.entry.path);
		case 'commitsGroup':
			return 'Commits';
		case 'commit':
			return shortId(element.commit.commitId);
		case 'loadMoreCommits':
			return 'Load More Commits';
		case 'pullRequestsGroup':
			return 'Pull Requests';
		case 'pullRequest':
			return `#${element.pullRequest.pullRequestId} ${element.pullRequest.title}`;
		case 'commentsGroup':
			return 'Comments';
		case 'comment':
			return truncate((element.comment.content ?? '').split('\n')[0], 60) ?? '(no content)';
		case 'error':
			return 'Error';
	}
}

function truncate(value: string, maxLength: number): string | undefined {
	if (!value) {
		return undefined;
	}
	return value.length > maxLength ? `${value.substring(0, maxLength)}…` : value;
}

function buildCommitTooltip(commit: CommitInfo): string {
	const author = commit.committerName || commit.authorName;
	const lines = [commit.commitId];
	if (author) {
		lines.push(`by ${author}`);
	}
	return lines.join('\n');
}

function buildPullRequestTooltip(pr: PullRequestInfo): string {
	const lines = [pr.title];
	if (pr.description) {
		lines.push(pr.description);
	}
	if (pr.sourceReference && pr.destinationReference) {
		lines.push(`${pr.sourceReference} → ${pr.destinationReference}`);
	}
	return lines.join('\n');
}

function buildCommentTooltip(comment: { content?: string; authorArn?: string }): string {
	const lines = [comment.content ?? ''];
	if (comment.authorArn) {
		lines.push(`by ${comment.authorArn}`);
	}
	return lines.join('\n');
}

async function loadRootChildren(service: CodeCommitService): Promise<TreeNode[]> {
	const repositories = await service.listRepositories();
	return repositories.map((repository) => ({ kind: 'repository' as const, repository }));
}

async function loadRepositoryChildren(
	_service: CodeCommitService,
	element: { repository: { name: string } }
): Promise<TreeNode[]> {
	return [
		{ kind: 'branchesGroup', repositoryName: element.repository.name },
		{ kind: 'pullRequestsGroup', repositoryName: element.repository.name },
	];
}

async function loadBranchesGroupChildren(
	service: CodeCommitService,
	element: { repositoryName: string }
): Promise<TreeNode[]> {
	const branches = await service.listBranches(element.repositoryName);
	return branches.map((branch) => ({ kind: 'branch' as const, repositoryName: element.repositoryName, branch }));
}

async function loadBranchChildren(
	service: CodeCommitService,
	element: { repositoryName: string; branch: { name: string } }
): Promise<TreeNode[]> {
	return [
		{ kind: 'filesGroup', repositoryName: element.repositoryName, branchName: element.branch.name },
		{ kind: 'commitsGroup', repositoryName: element.repositoryName, branchName: element.branch.name },
	];
}

async function loadFilesGroupChildren(
	service: CodeCommitService,
	element: { repositoryName: string; branchName: string }
): Promise<TreeNode[]> {
	const contents = await service.getFolder(element.repositoryName, element.branchName, '');
	return remoteEntriesToNodes(element.repositoryName, element.branchName, contents);
}

async function loadFolderChildren(
	service: CodeCommitService,
	element: { repositoryName: string; branchName: string; path: string }
): Promise<TreeNode[]> {
	const contents = await service.getFolder(element.repositoryName, element.branchName, element.path);
	return remoteEntriesToNodes(element.repositoryName, element.branchName, contents);
}

async function loadCommitsGroupChildren(
	service: CodeCommitService,
	element: { repositoryName: string; branchName: string },
	history: Map<string, CommitHistoryState>
): Promise<TreeNode[]> {
	const key = commitHistoryKey(element.repositoryName, element.branchName);
	let state = history.get(key);
	if (!state) {
		state = { commits: [] };
		history.set(key, state);
		const tip = await service.getBranch(element.repositoryName, element.branchName);
		const limit = getAwsSettings().commitHistoryLimit;
		state.commits = await service.listCommits(element.repositoryName, tip.commitId ?? '', limit);
	}
	const nodes: TreeNode[] = state.commits.map((commit) => ({
		kind: 'commit' as const,
		repositoryName: element.repositoryName,
		branchName: element.branchName,
		commit,
	}));
	const last = state.commits[state.commits.length - 1];
	if (last !== undefined && last.parents.length > 0) {
		nodes.push({
			kind: 'loadMoreCommits',
			repositoryName: element.repositoryName,
			branchName: element.branchName,
		});
	}
	return nodes;
}

async function loadPullRequestsGroupChildren(
	service: CodeCommitService,
	element: { repositoryName: string }
): Promise<TreeNode[]> {
	const pullRequests = await service.listPullRequests(element.repositoryName);
	return pullRequests.map((pullRequest) => ({
		kind: 'pullRequest' as const,
		repositoryName: element.repositoryName,
		pullRequest,
	}));
}

async function loadPullRequestChildren(
	service: CodeCommitService,
	element: { repositoryName: string; pullRequest: PullRequestInfo }
): Promise<TreeNode[]> {
	return [{ kind: 'commentsGroup', repositoryName: element.repositoryName, pullRequest: element.pullRequest }];
}

async function loadCommentsGroupChildren(
	service: CodeCommitService,
	element: { repositoryName: string; pullRequest: PullRequestInfo }
): Promise<TreeNode[]> {
	const pullRequest = element.pullRequest;
	const comments = await service.listComments(
		element.repositoryName,
		pullRequest.pullRequestId,
		pullRequest.destinationCommit,
		pullRequest.sourceCommit
	);
	return comments.map((comment) => ({
		kind: 'comment' as const,
		repositoryName: element.repositoryName,
		pullRequest,
		comment,
	}));
}

/** Turns a folder listing into sorted folder/file tree nodes. */
function remoteEntriesToNodes(
	repositoryName: string,
	branchName: string,
	contents: { subFolders: { path: string }[]; files: { path: string }[] }
): TreeNode[] {
	const folders = contents.subFolders
		.map((folder) => ({ kind: 'folder' as const, repositoryName, branchName, path: folder.path }))
		.sort((a, b) => a.path.localeCompare(b.path));
	const files = contents.files
		.map((file) => ({ kind: 'file' as const, repositoryName, branchName, entry: { path: file.path } }))
		.sort((a, b) => a.entry.path.localeCompare(b.entry.path));
	return [...folders, ...files];
}