import * as assert from 'assert';

import * as vscode from 'vscode';

const EXPECTED_COMMANDS = [
	'aws-codecommit-manager.configure',
	'aws-codecommit-manager.refresh',
	'aws-codecommit-manager.openFile',
	'aws-codecommit-manager.createBranch',
	'aws-codecommit-manager.deleteBranch',
	'aws-codecommit-manager.setDefaultBranch',
	'aws-codecommit-manager.putFile',
	'aws-codecommit-manager.deleteFile',
	'aws-codecommit-manager.createCommit',
	'aws-codecommit-manager.createPullRequest',
	'aws-codecommit-manager.updatePullRequestTitle',
	'aws-codecommit-manager.updatePullRequestDescription',
	'aws-codecommit-manager.publishPullRequest',
	'aws-codecommit-manager.closePullRequest',
	'aws-codecommit-manager.addPullRequestComment',
	'aws-codecommit-manager.loadMoreCommits',
];

suite('Extension runtime', () => {
	suite('activation', () => {
		let activationError: Error | undefined;

		suiteSetup(async () => {
			const extension =
				vscode.extensions.getExtension('aws-codecommit-manager') ??
				vscode.extensions.all.find((e) => e.packageJSON?.name === 'aws-codecommit-manager');
			assert.ok(extension, 'extension must be resolvable by id');
			try {
				await extension.activate();
			} catch (error) {
				activationError = error instanceof Error ? error : new Error(String(error));
			}
		});

		test('activates without throwing', () => {
			assert.strictEqual(activationError, undefined, `activation failed: ${activationError?.stack}`);
		});

		test('registers every contributed command', async () => {
			assert.strictEqual(activationError, undefined, 'activation must succeed first');
			const registered = new Set(await vscode.commands.getCommands(true));
			const missing = EXPECTED_COMMANDS.filter((id) => !registered.has(id));
			assert.deepStrictEqual(missing, [], 'all contributed commands must be registered');
		});

		test('refresh command executes without throwing', async () => {
			assert.strictEqual(activationError, undefined, 'activation must succeed first');
			await vscode.commands.executeCommand('aws-codecommit-manager.refresh');
		});
	});
});
