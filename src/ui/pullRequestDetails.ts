/**
 * Pull request details: builds and opens a read-only diff list of every changed
 * file between the PR's destination and source commits, and a details panel
 * with the PR title, description, status, and comment thread.
 */
import * as vscode from 'vscode';

import { DifferenceInfo, PullRequestInfo } from '../domain/types';
import { RemoteFileUri } from '../tree/remoteFileContentProvider';
import { notifyInfo } from '../commands/prompts';

/** Icon per change type so the list is scannable at a glance. */
export function changeTypeIcon(changeType: DifferenceInfo['changeType']): string {
	switch (changeType) {
		case 'A':
			return 'A'; // added
		case 'D':
			return 'D'; // deleted
		default:
			return 'M'; // modified
	}
}

/** Maps a change type to its TreeItem color for the changed-file list. */
export function mapChangeType(changeType: DifferenceInfo['changeType']): vscode.ThemeIcon {
	switch (changeType) {
		case 'A':
			return new vscode.ThemeIcon('diff-added');
		case 'D':
			return new vscode.ThemeIcon('diff-removed');
		default:
			return new vscode.ThemeIcon('diff-modified');
	}
}

/** Detail lines the details panel shows for a pull request. */
export interface PullRequestDetailLines {
	title: string;
	status: string;
	author: string;
	creationDate: string;
	description: string;
}

/** Builds the detail lines for the panel from a mapped pull request. */
export function buildDetailLines(pullRequest: PullRequestInfo): PullRequestDetailLines {
	return {
		title: `#${pullRequest.pullRequestId} ${pullRequest.title}`,
		status: pullRequest.status,
		author: pullRequest.authorArn ?? '',
		creationDate: pullRequest.creationDate ? pullRequest.creationDate.toISOString() : '',
		description: pullRequest.description ?? '',
	};
}

/** Builds the markdown content of the read-only details panel. */
export function buildDetailsMarkdown(pullRequest: PullRequestInfo): string {
	const lines = buildDetailLines(pullRequest);
	return [
		`## ${lines.title}`,
		'',
		`- **Status:** ${lines.status}`,
		`- **Author:** ${lines.author}`,
		`- **Created:** ${lines.creationDate}`,
		`- **Source:** ${pullRequest.sourceReference ?? ''} → **Destination:** ${pullRequest.destinationReference ?? ''}`,
		'',
		'### Description',
		'',
		lines.description || '(no description)',
	].join('\n');
}

/** Opens a diff editor per changed file between the PR's two commit ids. */
export async function openChangedFileDiffs(pullRequest: PullRequestInfo, differences: DifferenceInfo[]): Promise<number> {
	if (differences.length === 0) {
		notifyInfo(
			`Pull request #${pullRequest.pullRequestId} has no changed files between its source and destination commits.`
		);
		return 0;
	}
	const leftLabel = pullRequest.destinationReference?.replace('refs/heads/', '') ?? 'destination';
	const rightLabel = pullRequest.sourceReference?.replace('refs/heads/', '') ?? 'source';
	const repositoryName = pullRequest.repositoryName ?? '';
	let opened = 0;
	for (const difference of differences) {
		// Deleted files exist only on the destination side; added files only on the source side.
		const leftCommit = difference.beforeBlobId ? pullRequest.destinationCommit : pullRequest.sourceCommit;
		const rightCommit = difference.afterBlobId ? pullRequest.sourceCommit : pullRequest.destinationCommit;
		const leftSide = RemoteFileUri.build(repositoryName, leftLabel, difference.path, leftCommit);
		const rightSide = RemoteFileUri.build(repositoryName, rightLabel, difference.path, rightCommit);
		const title =
			difference.beforeBlobId && difference.afterBlobId
				? `${difference.path}: ${leftLabel} ↔ ${rightLabel}`
				: difference.beforeBlobId
					? `${difference.path} (deleted): ${leftLabel}`
					: `${difference.path} (new file): ${rightLabel}`;
		await vscode.commands.executeCommand('vscode.diff', leftSide, rightSide, title);
		opened++;
	}
	return opened;
}

