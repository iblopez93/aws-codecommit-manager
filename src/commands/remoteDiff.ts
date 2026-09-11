/**
 * Diff commands: compare a remote CodeCommit file against a local workspace
 * file, and compare the same file path across two branches.
 */
import * as vscode from 'vscode';

import { AppError } from '../domain/errors';
import { basename } from '../domain/paths';
import { getService } from '../state';
import { TreeNode } from '../tree/nodes';
import { REMOTE_FILE_SCHEME, RemoteFileUri } from '../tree/remoteFileContentProvider';
import { CancelledError, inputText, pickBranch } from './prompts';
import { requireRepositoryName } from './common';

/** Local relative target used when searching the workspace for matches. */
const LOCAL_FILE_GLOB = '**/*';
const LOCAL_FILE_EXCLUDE = '**/node_modules/**';

/**
 * Filters workspace files to those whose basename matches the remote file.
 * Pure helper so the matching (and the empty "missing file" case) is testable.
 */
export function findLocalCandidates(remotePath: string, files: readonly vscode.Uri[]): vscode.Uri[] {
	const name = basename(remotePath).toLowerCase();
	return files.filter((file) => basename(file.fsPath).toLowerCase() === name);
}

interface RemoteFileRef {
	repositoryName: string;
	specifier: string;
	filePath: string;
}

/** Resolves the remote side of a compare from a file node or the active editor. */
function resolveRemoteRef(node?: TreeNode): RemoteFileRef {
	if (node?.kind === 'file') {
		return {
			repositoryName: node.repositoryName,
			specifier: node.branchName,
			filePath: node.entry.path,
		};
	}
	const document = vscode.window.activeTextEditor?.document;
	if (document?.uri.scheme === REMOTE_FILE_SCHEME) {
		return RemoteFileUri.parse(document.uri);
	}
	throw new AppError(
		'Run this command from a remote file in the AWS CodeCommit view or with a remote file open in the editor.',
		{ kind: 'config' }
	);
}

/** Resolves the local workspace file to place on the left side of the diff. */
async function resolveLocalFile(remoteFilePath: string): Promise<vscode.Uri> {
	const files = await vscode.workspace.findFiles(LOCAL_FILE_GLOB, LOCAL_FILE_EXCLUDE);
	const candidates = findLocalCandidates(remoteFilePath, files);
	if (candidates.length === 1) {
		return candidates[0];
	}
	if (candidates.length > 1) {
		const picked = await vscode.window.showQuickPick(
			candidates.map((candidate) => ({
				label: vscode.workspace.asRelativePath(candidate),
				uri: candidate,
			})),
			{ title: 'Select the local file to compare' }
		);
		if (picked === undefined) {
			throw new CancelledError();
		}
		return picked.uri;
	}
	throw new AppError(
		`No local file named '${basename(remoteFilePath)}' was found in the open workspace folders. ` +
			'Open the workspace that contains the file and try again.',
		{ kind: 'config' }
	);
}

/** Compares a remote file against the matching local workspace file. */
export async function compareWithLocalCommand(node?: TreeNode): Promise<void> {
	const remote = resolveRemoteRef(node);
	const remoteUri = RemoteFileUri.build(remote.repositoryName, remote.specifier, remote.filePath);
	const localUri = await resolveLocalFile(remote.filePath);
	await vscode.commands.executeCommand(
		'vscode.diff',
		localUri,
		remoteUri,
		`${basename(remote.filePath)} (local) ↔ ${remote.repositoryName}/${remote.specifier}`
	);
}

/** Compares the same file path resolved from two user-picked branches. */
export async function compareAcrossBranchesCommand(node?: TreeNode): Promise<void> {
	const service = getService();
	const repositoryName = await requireRepositoryName(service, node);

	let filePath: string | undefined;
	if (node?.kind === 'file') {
		filePath = node.entry.path;
	} else {
		const document = vscode.window.activeTextEditor?.document;
		if (document?.uri.scheme === REMOTE_FILE_SCHEME) {
			filePath = RemoteFileUri.parse(document.uri).filePath;
		}
	}
	if (!filePath) {
		const entered = await inputText('Remote file path', {
			title: 'Compare File Across Branches',
			placeHolder: 'src/example.ts',
		});
		if (entered === undefined) {
			throw new CancelledError();
		}
		filePath = entered.trim().replace(/^\/+/, '');
		if (filePath.length === 0) {
			throw new CancelledError();
		}
	}

	const first = await pickBranch(service, repositoryName, 'Select the first (left) branch');
	if (!first) {
		throw new CancelledError();
	}
	const second = await pickBranch(service, repositoryName, 'Select the second (right) branch', first);
	if (!second) {
		throw new CancelledError();
	}

	await vscode.commands.executeCommand(
		'vscode.diff',
		RemoteFileUri.build(repositoryName, first, filePath, first),
		RemoteFileUri.build(repositoryName, second, filePath, second),
		`${repositoryName}:${filePath} — ${first} ↔ ${second}`
	);
}
