/**
 * Workspace integration commands: open the active file at its CodeCommit
 * location and compare the active file against its remote revision, using the
 * workspace git mapping to resolve repository, branch, and remote path.
 */
import * as vscode from 'vscode';

import { AppError } from '../domain/errors';
import { toRemotePath } from '../domain/paths';
import { resolveWorkspaceMapping, WorkspaceMapping } from '../integration/workspaceMapping';
import { getService } from '../state';
import { REMOTE_FILE_SCHEME, RemoteFileUri } from '../tree/remoteFileContentProvider';
import { CancelledError, pickBranch } from './prompts';
import { withProgress } from './common';

/** The active editor document must be a real workspace file. */
interface ActiveFile {
	folderUri: vscode.Uri;
	localUri: vscode.Uri;
	remotePath: string;
}

/** Resolves the active editor file, its workspace folder, and remote path. */
export function requireActiveWorkspaceFile(): ActiveFile {
	const editor = vscode.window.activeTextEditor;
	const document = editor?.document;
	if (!document || document.uri.scheme !== 'file') {
		throw new AppError('Open a local file in the editor to use this command.', { kind: 'config' });
	}
	const folder = vscode.workspace.getWorkspaceFolder(document.uri);
	if (folder === undefined) {
		throw new AppError(
			`'${document.uri.fsPath}' is not inside an open workspace folder, so its CodeCommit path cannot be determined.`,
			{ kind: 'config' }
		);
	}
	return {
		folderUri: folder.uri,
		localUri: document.uri,
		remotePath: toRemotePath(document.uri.fsPath, folder.uri.fsPath),
	};
}

/** Reports the unmapped-workspace case with an explicit message (task 2.3). */
function requireMapping(mapping: WorkspaceMapping | undefined): WorkspaceMapping {
	if (mapping === undefined) {
		throw new AppError(
			'No workspace folder is mapped to a CodeCommit remote. Add a CodeCommit remote (HTTPS or codecommit:: form) to the repository and try again.',
			{ kind: 'config' }
		);
	}
	return mapping;
}

/** Resolves the branch from the mapping or asks the user when unknown. */
async function requireBranch(mapping: WorkspaceMapping): Promise<string> {
	if (mapping.branchName) {
		return mapping.branchName;
	}
	const service = getService();
	const branchName = await pickBranch(service, mapping.repositoryName, 'Select the CodeCommit branch');
	if (!branchName) {
		throw new CancelledError();
	}
	return branchName;
}

/** Opens the active file at its CodeCommit location for the mapped repository. */
export async function openInCodeCommitCommand(): Promise<void> {
	const active = requireActiveWorkspaceFile();
	const mapping = requireMapping(await resolveWorkspaceMapping(active.folderUri));
	const branchName = await requireBranch(mapping);
	const uri = RemoteFileUri.build(mapping.repositoryName, branchName, active.remotePath, branchName);
	await vscode.window.showTextDocument(uri, { preview: true });
}

/**
 * Compares the active local file against its CodeCommit revision. Files that
 * do not exist remotely diff against an empty document (new-file view).
 */
export async function compareWithCodeCommitCommand(): Promise<void> {
	const active = requireActiveWorkspaceFile();
	const mapping = requireMapping(await resolveWorkspaceMapping(active.folderUri));
	const branchName = await requireBranch(mapping);
	const service = getService();

	const remoteUri = await withProgress(`Loading '${active.remotePath}' from CodeCommit...`, async () => {
		try {
			await service.getFile(mapping.repositoryName, branchName, active.remotePath);
			return RemoteFileUri.build(mapping.repositoryName, branchName, active.remotePath, branchName);
		} catch {
			// Missing remote path: diff against an empty untitled document.
			return vscode.workspace.openTextDocument({ content: '' });
		}
	});

	const title = `${active.remotePath} (local ↔ ${mapping.repositoryName}/${branchName})`;
	await vscode.commands.executeCommand('vscode.diff', active.localUri, remoteUri, title);
}

/** True when the document is a remote CodeCommit document. */
export function isRemoteDocument(uri: vscode.Uri | undefined): boolean {
	return uri?.scheme === REMOTE_FILE_SCHEME;
}
