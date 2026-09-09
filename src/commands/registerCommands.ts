/**
 * Registers every extension command with error normalization and cancellation
 * handling so handlers stay free of UI error plumbing.
 */
import * as vscode from 'vscode';

import { formatAppError, normalizeError } from '../domain/errors';
import { getService } from '../state';
import { createBranchCommand, deleteBranchCommand, setDefaultBranchCommand } from './branches';
import { configureCommand } from './configure';
import { createCommitCommand, deleteFileCommand, openFileCommand, putFileCommand } from './files';
import { loadMoreCommitsCommand, refreshCommand } from './navigation';
import { CancelledError } from './prompts';
import {
	addPullRequestCommentCommand,
	closePullRequestCommand,
	createPullRequestCommand,
	publishPullRequestCommand,
	updatePullRequestDescriptionCommand,
	updatePullRequestTitleCommand,
} from './pullRequests';

type CommandHandler = (...args: any[]) => void | Promise<void>;

/** Wraps a handler with error normalization and cancellation handling. */
function guarded(label: string, handler: CommandHandler): CommandHandler {
	return async (...args: any[]) => {
		try {
			await handler(...args);
		} catch (error) {
			if (error instanceof CancelledError) {
				return;
			}
			let region: string | undefined;
			let profile: string | undefined;
			try {
				const service = getService();
				region = service.region;
				profile = service.profile;
			} catch {
				// Service not initialized yet; still show the raw error below.
			}
			const appError = normalizeError(error, { region, profile });
			const detail = appError.code ? `\n[${appError.code}]` : '';
			void vscode.window.showErrorMessage(`${label} failed — ${formatAppError(appError)}${detail}`);
		}
	};
}

/** Registers all commands into the extension subscriptions. */
export function registerCommands(context: vscode.ExtensionContext): void {
	const commands: [string, CommandHandler][] = [
		['aws-codecommit-manager.configure', configureCommand],
		['aws-codecommit-manager.refresh', refreshCommand],
		['aws-codecommit-manager.openFile', openFileCommand],
		['aws-codecommit-manager.createBranch', createBranchCommand],
		['aws-codecommit-manager.deleteBranch', deleteBranchCommand],
		['aws-codecommit-manager.setDefaultBranch', setDefaultBranchCommand],
		['aws-codecommit-manager.putFile', putFileCommand],
		['aws-codecommit-manager.deleteFile', deleteFileCommand],
		['aws-codecommit-manager.createCommit', createCommitCommand],
		['aws-codecommit-manager.createPullRequest', createPullRequestCommand],
		['aws-codecommit-manager.updatePullRequestTitle', updatePullRequestTitleCommand],
		['aws-codecommit-manager.updatePullRequestDescription', updatePullRequestDescriptionCommand],
		['aws-codecommit-manager.publishPullRequest', publishPullRequestCommand],
		['aws-codecommit-manager.closePullRequest', closePullRequestCommand],
		['aws-codecommit-manager.addPullRequestComment', addPullRequestCommentCommand],
		['aws-codecommit-manager.loadMoreCommits', loadMoreCommitsCommand],
	];

	for (const [id, handler] of commands) {
		context.subscriptions.push(vscode.commands.registerCommand(id, guarded(id, handler)));
	}
}