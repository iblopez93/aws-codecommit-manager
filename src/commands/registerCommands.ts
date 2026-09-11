/**
 * Registers every extension command with error normalization and cancellation
 * handling so handlers stay free of UI error plumbing.
 */
import * as vscode from 'vscode';

import { normalizeError } from '../domain/errors';
import { getService } from '../state';
import { TreeNode } from '../tree/nodes';
import { showAppError } from '../ui/actionableErrors';
import { logOutcome, showLogsCommand } from '../ui/log';
import { createBranchCommand, deleteBranchCommand, setDefaultBranchCommand } from './branches';
import { configureCommand, loginCommand } from './configure';
import { createCommitCommand, deleteFileCommand, openFileCommand, putFileCommand, saveRemoteFileCommand } from './files';
import { loadMoreCommitsCommand, refreshCommand } from './navigation';
import { CancelledError } from './prompts';
import { compareAcrossBranchesCommand, compareWithLocalCommand } from './remoteDiff';
import { openConsoleCommand, statusBarMenuCommand } from './statusBarMenu';
import {
	addPullRequestCommentCommand,
	closePullRequestCommand,
	createPullRequestCommand,
	publishPullRequestCommand,
	showPullRequestReviewCommand,
	updatePullRequestDescriptionCommand,
	updatePullRequestTitleCommand,
} from './pullRequests';
import {
	copyCloneUrlCommand,
	createRepositoryCommand,
	deleteRepositoryCommand,
	openRepositoryCommand,
	repositoryDetailsCommand,
} from './repositoryAdmin';
import { compareWithCodeCommitCommand, openInCodeCommitCommand } from './workspaceIntegration';

type CommandHandler = (...args: any[]) => void | Promise<void>;


/** Wraps a handler with error normalization and cancellation handling. */
function guarded(label: string, handler: CommandHandler): CommandHandler {
	return async (...args: any[]) => {
		const started = Date.now();
		try {
			await handler(...args);
			logOutcome(label, undefined, Date.now() - started);
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
			logOutcome(label, error, Date.now() - started);
			await showAppError(appError, {
				retry: async () => {
					await handler(...args);
				},
			});
		}
	};
}

/** Registers all commands into the extension subscriptions. */
export function registerCommands(context: vscode.ExtensionContext): void {
	const commands: [string, CommandHandler][] = [
		['aws-codecommit-manager.configure', configureCommand],
		['aws-codecommit-manager.login', loginCommand],
		['aws-codecommit-manager.refresh', refreshCommand],
		['aws-codecommit-manager.createRepository', createRepositoryCommand],
		['aws-codecommit-manager.deleteRepository', deleteRepositoryCommand],
		['aws-codecommit-manager.copyCloneUrlHttps', (node?: TreeNode) => copyCloneUrlCommand('https', node)],
		['aws-codecommit-manager.copyCloneUrlGrc', (node?: TreeNode) => copyCloneUrlCommand('grc', node)],
		['aws-codecommit-manager.openRepository', openRepositoryCommand],
		['aws-codecommit-manager.repositoryDetails', repositoryDetailsCommand],
		['aws-codecommit-manager.openFile', openFileCommand],
		['aws-codecommit-manager.saveRemoteFile', saveRemoteFileCommand],
		['aws-codecommit-manager.compareWithLocal', compareWithLocalCommand],
		['aws-codecommit-manager.compareAcrossBranches', compareAcrossBranchesCommand],
		['aws-codecommit-manager.showLogs', showLogsCommand],
		['aws-codecommit-manager.statusBarMenu', statusBarMenuCommand],
		['aws-codecommit-manager.openConsole', openConsoleCommand],
		['aws-codecommit-manager.openInCodeCommit', openInCodeCommitCommand],
		['aws-codecommit-manager.compareWithCodeCommit', compareWithCodeCommitCommand],
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
		['aws-codecommit-manager.showPullRequestReview', showPullRequestReviewCommand],
		['aws-codecommit-manager.addPullRequestComment', addPullRequestCommentCommand],
		['aws-codecommit-manager.loadMoreCommits', loadMoreCommitsCommand],
	];

	for (const [id, handler] of commands) {
		context.subscriptions.push(vscode.commands.registerCommand(id, guarded(id, handler)));
	}
}