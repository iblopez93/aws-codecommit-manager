/**
 * File and commit commands: open remote file, upload file, delete remote file,
 * and create an atomic multi-file commit from local workspace files.
 */
import * as vscode from 'vscode';

import { AppError } from '../domain/errors';
import { shortId } from '../domain/mappers';
import { basename, toRemotePath } from '../domain/paths';
import { getService, getTreeProvider } from '../state';
import { TreeNode } from '../tree/nodes';
import { RemoteFileUri } from '../tree/remoteFileContentProvider';
import { CancelledError, confirmAction, inputText, notifySuccess } from './prompts';
import { refreshBranch, requireBranchName, requireBranchTip, requireRepositoryName, withProgress } from './common';

/** Opens a remote file in a read-only editor tab. */
export async function openFileCommand(node?: TreeNode): Promise<void> {
	if (node?.kind !== 'file') {
		return;
	}
	const uri = RemoteFileUri.build(node.repositoryName, node.branchName, node.entry.path, node.branchName);
	await vscode.window.showTextDocument(uri, { preview: true });
}

/** Uploads a local file to a branch with PutFile. */
export async function putFileCommand(node?: TreeNode): Promise<void> {
	const service = getService();
	const repositoryName = await requireRepositoryName(service, node);
	const branchName = await requireBranchName(service, repositoryName, node);

	const selected = await vscode.window.showOpenDialog({
		canSelectMany: false,
		canSelectFolders: false,
		openLabel: 'Upload File',
	});
	if (selected === undefined || selected.length === 0) {
		throw new CancelledError();
	}
	const fileUri = selected[0];
	const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
	if (workspaceFolder === undefined) {
		throw new AppError(
			`'${fileUri.fsPath}' is not inside an open workspace folder. Open the containing folder and try again.`,
			{ kind: 'config' }
		);
	}
	const defaultRemotePath = toRemotePath(fileUri.fsPath, workspaceFolder.uri.fsPath);
	const remotePathInput = await inputText('Remote path', {
		value: defaultRemotePath,
		title: `Upload to ${branchName}`,
	});
	if (remotePathInput === undefined) {
		throw new CancelledError();
	}
	const remotePath = remotePathInput.trim().replace(/^\/+/, '');
	if (remotePath.length === 0) {
		throw new CancelledError();
	}

	const commitMessage = await inputText('Commit message', {
		value: `Add ${basename(remotePath)}`,
		title: 'Upload File',
	});
	if (commitMessage === undefined) {
		throw new CancelledError();
	}

	const fileContent = await vscode.workspace.fs.readFile(fileUri);
	const result = await withProgress(`Uploading '${remotePath}'...`, async () => {
		const parentCommitId = await requireBranchTip(service, repositoryName, branchName);
		return service.putFile({
			repositoryName,
			branchName,
			parentCommitId,
			filePath: remotePath,
			fileContent,
			commitMessage: commitMessage.trim(),
		});
	});

	notifySuccess(`Uploaded '${remotePath}' (commit ${shortId(result.commitId, 12)}).`);
	refreshBranch(repositoryName, branchName);
}

/** Deletes a remote file on the branch tip after confirmation. */
export async function deleteFileCommand(node?: TreeNode): Promise<void> {
	if (node?.kind !== 'file') {
		return;
	}
	const service = getService();
	const repositoryName = node.repositoryName;
	const branchName = node.branchName;
	const filePath = node.entry.path;

	const confirmed = await confirmAction(
		`Delete remote file '${filePath}' on '${branchName}'?`,
		'This creates a commit that removes the file from the repository.'
	);
	if (!confirmed) {
		return;
	}

	const result = await withProgress(`Deleting '${filePath}'...`, async () => {
		const parentCommitId = await requireBranchTip(service, repositoryName, branchName);
		return service.deleteFile({
			repositoryName,
			branchName,
			parentCommitId,
			filePath,
			commitMessage: `Delete ${filePath}`,
		});
	});

	notifySuccess(`Deleted '${filePath}' (commit ${shortId(result.commitId, 12)}).`);
	refreshBranch(repositoryName, branchName);
}

/** Creates a single atomic commit from multiple local workspace files. */
export async function createCommitCommand(node?: TreeNode): Promise<void> {
	const service = getService();
	const repositoryName = await requireRepositoryName(service, node);
	const branchName = await requireBranchName(service, repositoryName, node);

	const selected = await vscode.window.showOpenDialog({
		canSelectMany: true,
		canSelectFolders: false,
		openLabel: 'Select Files to Commit',
	});
	if (selected === undefined || selected.length === 0) {
		throw new CancelledError();
	}

	const putFiles: { filePath: string; fileContent: Uint8Array }[] = [];
	const seenPaths = new Set<string>();
	for (const fileUri of selected) {
		const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
		if (workspaceFolder === undefined) {
			throw new AppError(
				`'${fileUri.fsPath}' is not inside an open workspace folder. Open the containing folder and try again.`,
				{ kind: 'config' }
			);
		}
		const filePath = toRemotePath(fileUri.fsPath, workspaceFolder.uri.fsPath);
		if (seenPaths.has(filePath)) {
			throw new AppError(`Two selected files map to the same remote path '${filePath}'.`, {
				kind: 'config',
			});
		}
		seenPaths.add(filePath);
		const fileContent = await vscode.workspace.fs.readFile(fileUri);
		putFiles.push({ filePath, fileContent });
	}

	const commitMessageInput = await inputText('Commit message', {
		title: `Create Commit on ${branchName}`,
	});
	if (commitMessageInput === undefined || commitMessageInput.trim().length === 0) {
		throw new CancelledError();
	}

	const result = await withProgress(`Creating commit on '${branchName}'...`, async () => {
		const parentCommitId = await requireBranchTip(service, repositoryName, branchName);
		return service.createCommit({
			repositoryName,
			branchName,
			parentCommitId,
			commitMessage: commitMessageInput.trim(),
			putFiles,
		});
	});

	notifySuccess(
		`Commit ${shortId(result.commitId, 12)} created on '${branchName}' with ${putFiles.length} file(s).`
	);
	refreshBranch(repositoryName, branchName);
}