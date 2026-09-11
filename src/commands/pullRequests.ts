/**
 * Pull request commands: create, update title/description, open/publish,
 * close, and add review comments.
 */
import * as vscode from 'vscode';

import { PullRequestInfo } from '../domain/types';
import { resolveWorkspaceMapping } from '../integration/workspaceMapping';
import { getService, getTreeProvider } from '../state';
import { TreeNode } from '../tree/nodes';
import { buildDetailsMarkdown, openChangedFileDiffs } from '../ui/pullRequestDetails';
import {
	CancelledError,
	confirmAction,
	inputText,
	notifySuccess,
	pickBranch,
	pickPullRequest,
} from './prompts';
import { refreshPullRequests, requireRepositoryName, withProgress } from './common';

/** Creates a pull request between two branches of a repository. */
export async function createPullRequestCommand(node?: TreeNode): Promise<void> {
	const service = getService();
	const repositoryName = await requireRepositoryName(service, node);

	let sourceBranch: string;
	if (node?.kind === 'branch') {
		sourceBranch = node.branch.name;
	} else {
		// Default the source branch to the workspace-mapped branch when it exists.
		const mapping = await resolveWorkspaceMapping().catch(() => undefined);
		const preferred =
			mapping?.repositoryName === repositoryName ? mapping.branchName : undefined;
		const picked = await pickBranch(service, repositoryName, 'Source branch', undefined, preferred);
		if (picked === undefined) {
			throw new CancelledError();
		}
		sourceBranch = picked;
	}
	const destinationBranch = await pickBranch(service, repositoryName, 'Destination branch', sourceBranch);
	if (destinationBranch === undefined) {
		throw new CancelledError();
	}

	const titleInput = await inputText('Pull request title', { title: 'Create Pull Request' });
	if (titleInput === undefined || titleInput.trim().length === 0) {
		throw new CancelledError();
	}
	const descriptionInput = await inputText('Pull request description (optional)', {
		title: 'Create Pull Request',
	});

	const pullRequest = await withProgress(`Creating pull request...`, () =>
		service.createPullRequest({
			repositoryName,
			title: titleInput.trim(),
			description: descriptionInput?.trim() || undefined,
			sourceReference: sourceBranch,
			destinationReference: destinationBranch,
		})
	);

	notifySuccess(
		`Pull request #${pullRequest.pullRequestId} created: ${sourceBranch} → ${destinationBranch}`
	);
	refreshPullRequests(repositoryName);
}

/** Updates the title of a pull request node. */
export async function updatePullRequestTitleCommand(node?: TreeNode): Promise<void> {
	if (node?.kind !== 'pullRequest') {
		return;
	}
	const service = getService();
	const pullRequest = node.pullRequest;

	const input = await inputText('Pull request title', {
		title: 'Update Pull Request Title',
		value: pullRequest.title,
	});
	if (input === undefined || input.trim().length === 0) {
		throw new CancelledError();
	}

	const updated = await withProgress('Updating pull request title...', () =>
		service.updatePullRequestTitle(pullRequest.pullRequestId, input.trim())
	);

	notifySuccess(`Pull request #${updated.pullRequestId} title updated.`);
	refreshPullRequestNode(node);
}

/** Updates the description of a pull request node. */
export async function updatePullRequestDescriptionCommand(node?: TreeNode): Promise<void> {
	if (node?.kind !== 'pullRequest') {
		return;
	}
	const service = getService();
	const pullRequest = node.pullRequest;

	const input = await inputText('Pull request description', {
		title: 'Update Pull Request Description',
		value: pullRequest.description ?? '',
	});
	if (input === undefined) {
		throw new CancelledError();
	}

	const updated = await withProgress('Updating pull request description...', () =>
		service.updatePullRequestDescription(pullRequest.pullRequestId, input.trim())
	);

	notifySuccess(`Pull request #${updated.pullRequestId} description updated.`);
	refreshPullRequestNode(node);
}

/** Opens (publishes) an already closed pull request. */
export async function publishPullRequestCommand(node?: TreeNode): Promise<void> {
	if (node?.kind !== 'pullRequest') {
		return;
	}
	const service = getService();
	const pullRequest = node.pullRequest;

	if (pullRequest.status === 'OPEN') {
		await vscode.window.showInformationMessage(`Pull request #${pullRequest.pullRequestId} is already open.`);
		return;
	}

	const updated = await withProgress(`Opening pull request #${pullRequest.pullRequestId}...`, () =>
		service.updatePullRequestStatus(pullRequest.pullRequestId, 'OPEN')
	);

	notifySuccess(`Pull request #${updated.pullRequestId} is open.`);
	refreshPullRequestNode(node);
}

/** Closes an open pull request after confirmation. */
export async function closePullRequestCommand(node?: TreeNode): Promise<void> {
	if (node?.kind !== 'pullRequest') {
		return;
	}
	const service = getService();
	const pullRequest = node.pullRequest;

	if (pullRequest.status === 'CLOSED') {
		await vscode.window.showInformationMessage(`Pull request #${pullRequest.pullRequestId} is already closed.`);
		return;
	}

	const confirmed = await confirmAction(
		`Close pull request #${pullRequest.pullRequestId}?`,
		'Closed pull requests cannot be merged.'
	);
	if (!confirmed) {
		return;
	}

	const updated = await withProgress(`Closing pull request #${pullRequest.pullRequestId}...`, () =>
		service.updatePullRequestStatus(pullRequest.pullRequestId, 'CLOSED')
	);

	notifySuccess(`Pull request #${updated.pullRequestId} closed.`);
	refreshPullRequestNode(node);
}

/** Adds a general review comment to a pull request. */
export async function addPullRequestCommentCommand(node?: TreeNode): Promise<void> {
	const service = getService();
	let repositoryName: string | undefined;
	let pullRequest: PullRequestInfo | undefined;

	if (node?.kind === 'pullRequest') {
		repositoryName = node.repositoryName;
		pullRequest = node.pullRequest;
	} else if (node?.kind === 'commentsGroup') {
		repositoryName = node.repositoryName;
		pullRequest = node.pullRequest;
	}
	if (repositoryName === undefined || pullRequest === undefined) {
		return;
	}

	const contentInput = await inputText('Review comment', { title: `Comment on PR #${pullRequest.pullRequestId}` });
	if (contentInput === undefined || contentInput.trim().length === 0) {
		throw new CancelledError();
	}

	await withProgress('Posting comment...', () =>
		service.postComment({
			repositoryName,
			pullRequestId: pullRequest.pullRequestId,
			content: contentInput.trim(),
			beforeCommitId: pullRequest.destinationCommit,
			afterCommitId: pullRequest.sourceCommit,
		})
	);

	notifySuccess(`Comment posted on pull request #${pullRequest.pullRequestId}.`);
	getTreeProvider().refresh({
		kind: 'commentsGroup',
		repositoryName,
		pullRequest,
	});
}

/**
 * Shows the full review of a pull request: a details panel with its metadata
 * plus one diff editor per changed file between its source and destination.
 */
export async function showPullRequestReviewCommand(node?: TreeNode): Promise<void> {
	const service = getService();
	const repositoryName = node?.kind === 'pullRequest' ? node.repositoryName : await requireRepositoryName(service, node);
	const pullRequest =
		node?.kind === 'pullRequest'
			? node.pullRequest
			: await withProgress('Loading pull request...', async () => {
					const picked = await pickPullRequest(service, repositoryName, 'Show Pull Request Review');
					if (picked === undefined) {
						throw new CancelledError();
					}
					const full = await service.getPullRequest(picked.pullRequestId);
					return full;
				});

	await withProgress(`Loading changed files of pull request #${pullRequest.pullRequestId}...`, async () => {
		const differences = await service.getPullRequestDifferences(pullRequest);
		await openChangedFileDiffs(pullRequest, differences);
		// Details document: opens as a read-only text preview with the metadata.
		const details = buildDetailsMarkdown(pullRequest);
		const doc = await vscode.workspace.openTextDocument({ content: details, language: 'markdown' });
		await vscode.window.showTextDocument(doc, { preview: true, preserveFocus: true });
	});
}

/** Refreshes a pull request node in the tree. */
function refreshPullRequestNode(node: { repositoryName: string; pullRequest: { pullRequestId: string } }): void {
	getTreeProvider().refresh({
		kind: 'pullRequest',
		repositoryName: node.repositoryName,
		pullRequest: {
			pullRequestId: node.pullRequest.pullRequestId,
			title: '',
			status: 'OPEN',
		},
	});
}