/**
 * Status bar item showing AWS connection state (connected/disconnected).
 * Follows the AWS Toolkit standard pattern.
 */
import * as vscode from 'vscode';

import { getAwsSettings } from '../aws/config';
import { isConnected } from '../aws/client';

let statusBarItem: vscode.StatusBarItem | undefined;

/** Creates the status bar item and registers it in the extension subscriptions. */
export function createStatusBar(context: vscode.ExtensionContext): void {
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	statusBarItem.command = 'aws-codecommit-manager.login';
	statusBarItem.tooltip = 'Click to login to AWS CodeCommit';
	context.subscriptions.push(statusBarItem);
	void updateStatusBar();
	statusBarItem.show();
}

/** Updates the status bar based on current credential state. */
export async function updateStatusBar(): Promise<void> {
	if (!statusBarItem) {
		return;
	}
	const connected = await isConnected(getAwsSettings());
	if (connected) {
		statusBarItem.text = '$(check) AWS CodeCommit: Connected';
		statusBarItem.backgroundColor = undefined;
	} else {
		statusBarItem.text = '$(plug) AWS CodeCommit: Disconnected';
		statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
	}
}
