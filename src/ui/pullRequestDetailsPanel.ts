/**
 * Refreshable webview panel showing pull request details: title, description,
 * status, and the review comment thread. Owns its reveal/refresh lifecycle and
 * serializes to plain HTML so the rendering helpers stay unit testable.
 */
import * as vscode from 'vscode';

import { compactArn } from '../domain/mappers';
import { CommentInfo, PullRequestInfo } from '../domain/types';
import { CodeCommitService } from '../services/codeCommitService';

/** Renders a comment's author, date, and content as a list item. */
export function renderComment(comment: CommentInfo): string {
	const author = compactArn(comment.authorArn) || 'unknown';
	const date = comment.creationDate ? new Date(comment.creationDate).toISOString().substring(0, 10) : '';
	const where = comment.location?.filePath ? ` — ${comment.location.filePath}` : '';
	const content = escapeHtml(comment.content ?? '(no content)');
	return `<li><strong>${escapeHtml(author)}</strong> <small>${date}${escapeHtml(where)}</small><p>${content}</p></li>`;
}

/** Escapes HTML-sensitive characters in user-provided text. */
export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/** Builds the full HTML document shown in the panel. */
export function buildPanelHtml(pullRequest: PullRequestInfo, comments: CommentInfo[]): string {
	const source = pullRequest.sourceReference?.replace('refs/heads/', '') ?? '';
	const destination = pullRequest.destinationReference?.replace('refs/heads/', '') ?? '';
	const commentItems = comments.length > 0 ? comments.map(renderComment).join('\n') : '<li>No review comments yet.</li>';
	return [
		'<!DOCTYPE html>',
		'<html>',
		'<body>',
		`<h1>#${pullRequest.pullRequestId} ${escapeHtml(pullRequest.title)}</h1>`,
		`<p><strong>Status:</strong> ${escapeHtml(pullRequest.status)} &nbsp; <strong>Author:</strong> ${escapeHtml(compactArn(pullRequest.authorArn) || 'unknown')}</p>`,
		`<p>${escapeHtml(destination)} ← ${escapeHtml(source)}</p>`,
		'<h2>Description</h2>',
		`<p>${escapeHtml(pullRequest.description ?? '(no description)')}</p>`,
		'<h2>Review Comments</h2>',
		`<ul>${commentItems}</ul>`,
		'</body>',
		'</html>',
	].join('\n');
}

/** Opens (or reveals) a webview panel with the pull request details. */
export async function showPullRequestDetails(
	service: CodeCommitService,
	pullRequest: PullRequestInfo,
	existingPanel?: vscode.WebviewPanel
): Promise<vscode.WebviewPanel> {
	const comments = await service
		.listComments(pullRequest.repositoryName ?? '', pullRequest.pullRequestId)
		.catch(() => [] as CommentInfo[]);
	const panel =
		existingPanel ??
		vscode.window.createWebviewPanel(
			'awsCodeCommitPullRequestDetails',
			`PR #${pullRequest.pullRequestId}`,
			vscode.ViewColumn.Active,
			{ enableScripts: false }
		);
	panel.title = `PR #${pullRequest.pullRequestId} ${pullRequest.title}`;
	panel.webview.html = buildPanelHtml(pullRequest, comments);
	openPanels.set(pullRequest.pullRequestId, panel);
	panel.onDidDispose(() => openPanels.delete(pullRequest.pullRequestId));
	return panel;
}

/** Open detail panels by pull request id, used to refresh instead of recreate. */
const openPanels = new Map<string, vscode.WebviewPanel>();

/**
 * Refreshes the open panel for a pull request (e.g. after a write operation)
 * without recreating it. No-op when the panel was closed or never opened.
 */
export async function refreshPullRequestDetails(
	service: CodeCommitService,
	pullRequest: PullRequestInfo
): Promise<void> {
	const existing = openPanels.get(pullRequest.pullRequestId);
	if (existing) {
		await showPullRequestDetails(service, pullRequest, existing);
	}
}
