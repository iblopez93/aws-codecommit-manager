/**
 * Status bar quick menu: the entry point offered when the connection is
 * healthy, covering the most common follow-up actions.
 */
import * as vscode from 'vscode';

import { getAwsSettings } from '../aws/config';
import { log } from '../ui/log';
import { CancelledError } from './prompts';

/** One entry of the status bar menu (pure, for tests). */
export interface StatusBarMenuItem {
	label: string;
	description?: string;
	command: string;
}

/** The static entries shown in the menu. */
export function buildStatusBarMenuItems(region?: string): StatusBarMenuItem[] {
	return [
		{ label: '$(sync) Refresh', description: 'Reload repositories and trees', command: 'aws-codecommit-manager.refresh' },
		{ label: '$(gear) Configure Connection', description: 'Region, profile, and SSO settings', command: 'aws-codecommit-manager.configure' },
		{ label: '$(output) Show Logs', description: 'Diagnostics for recent operations', command: 'aws-codecommit-manager.showLogs' },
		{
			label: '$(link-external) Open in AWS Console',
			description: region ? `CodeCommit console in ${region}` : 'CodeCommit console',
			command: 'aws-codecommit-manager.openConsole',
		},
	];
}

/** Opens the CodeCommit browser console for the configured region. */
export async function openConsoleCommand(): Promise<void> {
	const region = getAwsSettings().region || 'us-east-1';
	const url = vscode.Uri.parse(`https://${region}.console.aws.amazon.com/codesuite/codecommit/repositories?region=${region}`);
	log('INFO', 'open-console', `opening ${url}`);
	await vscode.env.openExternal(url);
}

/** Shows the status bar quick menu and runs the chosen entry. */
export async function statusBarMenuCommand(): Promise<void> {
	const region = getAwsSettings().region;
	const items = buildStatusBarMenuItems(region);
	const picked = await vscode.window.showQuickPick(
		items.map((item) => ({ label: item.label, description: item.description, command: item.command })),
		{ title: 'AWS CodeCommit', placeHolder: 'Choose an action' }
	);
	if (picked === undefined) {
		throw new CancelledError();
	}
	await vscode.commands.executeCommand(picked.command);
}
