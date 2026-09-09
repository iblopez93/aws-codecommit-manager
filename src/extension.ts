/**
 * Extension entry point: wires the AWS service, the tree view, the remote file
 * document provider, configuration watching, and all commands.
 */
import * as vscode from 'vscode';

import { CONFIG_SECTION, getAwsSettings } from './aws/config';
import { reloadService } from './commands/configure';
import { registerCommands } from './commands/registerCommands';
import { createCodeCommitService } from './services/awsCodeCommitService';
import { getService, setService, setTreeProvider } from './state';
import { CodeCommitTreeProvider } from './tree/codeCommitTreeProvider';
import { REMOTE_FILE_SCHEME, RemoteFileContentProvider } from './tree/remoteFileContentProvider';

// This method is called when your extension is activated.
export function activate(context: vscode.ExtensionContext) {
	setService(createCodeCommitService(getAwsSettings()));
	const treeProvider = new CodeCommitTreeProvider(getService());
	setTreeProvider(treeProvider);

	context.subscriptions.push(
		vscode.window.registerTreeDataProvider('aws-codecommit-manager.view', treeProvider),
		vscode.workspace.registerTextDocumentContentProvider(
			REMOTE_FILE_SCHEME,
			new RemoteFileContentProvider(getService())
		),
		vscode.workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration(CONFIG_SECTION)) {
				reloadService();
			}
		})
	);

	registerCommands(context);
}

// This method is called when your extension is deactivated.
export function deactivate() {}
