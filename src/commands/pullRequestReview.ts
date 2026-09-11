/**
 * Pull request review commands: open per-file diffs between the source and
 * destination revisions, open a changed file at its source revision, add
 * comments anchored to a file and line, and open the details panel.
 */
import * as vscode from 'vscode';

import { AppError } from '../domain/errors';
import { TreeNode } from '../tree/nodes';
import { EMPTY_COMMIT_ID, REMOTE_FILE_SCHEME, RemoteFileUri } from '../tree/remoteFileContentProvider';
import { showPullRequestDetails, refreshPullRequestDetails } from '../ui/pullRequestDetailsPanel';
import { getService } from '../state';
import { CancelledError, inputText } from './prompts';

/** Builds a diff side for a changed file, rendering the missing side empty. */
export function buildChangedFileSides(node: Extract<TreeNode, { kind: 'changedFile' }>): {
	destination: vscode.Uri;
	source: vscode.Uri;
} {
	const { pullRequest, difference, repositoryName } = node;
	const hasDestination = Boolean(difference.beforeBlobId);
	const hasSource = Boolean(difference.afterBlobId);
	const destinationRevision = hasDestination ? pullRequest.destinationCommit : EMPTY_COMMIT_ID;
	const sourceRevision = hasSource ? pullRequest.sourceCommit : EMPTY_COMMIT_ID;
	if (!destinationRevision || !sourceRevision) {
		throw new AppError(
			`Pull request #${pullRequest.pullRequestId} has no source or destination commit; the diff cannot be opened.`,
			{ kind: 'codecommit' }
		);
	}
	return {
		destination: RemoteFileUri.build(repositoryName, pullRequest.destinationReference ?? '', difference.path, destinationRevision),
		source: RemoteFileUri.build(repositoryName, pullRequest.sourceReference ?? '', difference.path, sourceRevision),
	};
}

/** Opens the diff editor for a changed file of a pull request. */
export async function openChangedFileDiffCommand(node?: TreeNode): Promise<void> {
	if (node?.kind !== 'changedFile') {
		return;
	}
	const { destination, source } = buildChangedFileSides(node);
	await vscode.commands.executeCommand(
		'vscode.diff',
		destination,
		source,
		`${node.difference.path} — PR #${node.pullRequest.pullRequestId}`
	);
}

/** Opens a changed file at its source revision (read-only, commit-pinned). */
export async function openChangedFileCommand(node?: TreeNode): Promise<void> {
	if (node?.kind !== 'changedFile') {
		return;
	}
	if (!node.difference.afterBlobId || !node.pullRequest.sourceCommit) {
		throw new AppError(
			`'${node.difference.path}' has no source revision (deleted in this pull request).`,
			{ kind: 'codecommit' }
		);
	}
	const uri = RemoteFileUri.build(
		node.repositoryName,
		node.pullRequest.sourceReference ?? '',
		node.difference.path,
		node.pullRequest.sourceCommit
	);
	await vscode.window.showTextDocument(uri, { preview: true });
}

/** Asks for the comment text, optionally anchored to a line number. */
async function requestComment(): Promise<{ content: string; filePosition?: number } | undefined> {
	const content = await inputText('Comment', { title: 'Add Review Comment' });
	if (content === undefined || content.trim().length === 0) {
		return undefined;
	}
	const lineInput = await inputText('Line number (optional, leave empty for file-level)', {
		title: 'Anchor Line',
		placeHolder: 'e.g. 42',
	});
	if (lineInput === undefined) {
		return undefined;
	}
	const parsed = Number.parseInt(lineInput.trim(), 10);
	return { content: content.trim(), filePosition: Number.isNaN(parsed) ? undefined : parsed };
}

/** Adds a review comment anchored to a changed file and optional line. */
export async function addCommentOnFileCommand(node?: TreeNode): Promise<void> {
	if (node?.kind !== 'changedFile') {
		return;
	}
	const comment = await requestComment();
	if (comment === undefined) {
		throw new CancelledError();
	}
	const service = getService();
	await service.postComment({
		repositoryName: node.repositoryName,
		pullRequestId: node.pullRequest.pullRequestId,
		beforeCommitId: node.pullRequest.destinationCommit,
		afterCommitId: node.pullRequest.sourceCommit,
		content: comment.content,
		location: {
			filePath: node.difference.path,
			filePosition: comment.filePosition ?? 1,
			relativeFileVersion: 'AFTER',
		},
	});
	vscode.window.showInformationMessage(
		`Comment added to '${node.difference.path}'` +
			(comment.filePosition !== undefined ? ` (line ${comment.filePosition}).` : '.')
	);
	await refreshPullRequestDetails(getService(), node.pullRequest);
}

/** Opens the pull request details panel for a pull request node. */
export async function showPullRequestDetailsCommand(node?: TreeNode): Promise<void> {
	if (node?.kind !== 'pullRequest') {
		return;
	}
	await showPullRequestDetails(getService(), node.pullRequest);
}
