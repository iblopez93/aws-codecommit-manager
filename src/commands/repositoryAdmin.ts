/**
 * Repository administration commands: create and delete repositories with typed
 * confirmation, copy clone URLs (HTTPS/GRC), open the region-aware AWS console,
 * and inspect repository metadata in a copyable quick pick.
 */
import * as vscode from 'vscode';

import { CancelledError, inputText, notifyInfo, notifySuccess } from './prompts';
import { withProgress } from './common';
import { getService, getTreeProvider } from '../state';
import { TreeNode } from '../tree/nodes';

/** Extracts the repository name from a repository node, or undefined. */
function repositoryNameOf(node?: TreeNode): string | undefined {
	if (node?.kind === 'repository') {
		return node.repository.name;
	}
	if (node && typeof node.kind === 'string' && 'repositoryName' in node && typeof node.repositoryName === 'string') {
		return node.repositoryName;
	}
	return undefined;
}

/** Throws a cancellable error when the command was not run on a repository node. */
async function requireRepositoryNode(node?: TreeNode): Promise<string> {
	const name = repositoryNameOf(node);
	if (!name) {
		throw new CancelledError();
	}
	return name;
}

/** Creates a repository from prompted name and description, then refreshes. */
export async function createRepositoryCommand(): Promise<void> {
	const service = getService();
	const nameInput = await inputText('Repository name', {
		title: 'Create Repository',
		placeHolder: 'my-repository',
		validate: (value) => {
			const trimmed = value.trim();
			if (trimmed.length === 0) {
				return 'A repository name is required.';
			}
			if (!/^[a-zA-Z0-9-_.]+$/.test(trimmed)) {
				return 'Names may only contain letters, digits, hyphens, underscores and dots.';
			}
			return undefined;
		},
	});
	if (nameInput === undefined) {
		throw new CancelledError();
	}
	const descriptionInput = await inputText('Repository description (optional)', {
		title: 'Create Repository',
		placeHolder: 'Describe the repository',
		validate: () => undefined,
	});
	if (descriptionInput === undefined) {
		throw new CancelledError();
	}

	const created = await withProgress(`Creating repository '${nameInput.trim()}'...`, () =>
		service.createRepository({
			name: nameInput.trim(),
			description: descriptionInput.trim().length > 0 ? descriptionInput.trim() : undefined,
		})
	);
	notifySuccess(`Repository '${created.name}' created.`);
	getTreeProvider().refresh();
}

/** Deletes a repository only after the user types its exact name. */
export async function deleteRepositoryCommand(node?: TreeNode): Promise<void> {
	const service = getService();
	const repositoryName = await requireRepositoryNode(node);
	const typed = await inputText(`Type '${repositoryName}' to permanently delete this repository`, {
		title: 'Delete Repository',
		placeHolder: repositoryName,
		validate: () => undefined,
	});
	if (typed === undefined) {
		throw new CancelledError();
	}
	if (typed.trim() !== repositoryName) {
		notifyInfo('Repository name did not match; deletion was aborted.');
		return;
	}

	await withProgress(`Deleting repository '${repositoryName}'...`, () => service.deleteRepository(repositoryName));
	notifySuccess(`Repository '${repositoryName}' deleted.`);
	getTreeProvider().refresh();
}

/** Derives the GRC (git-remote-codecommit) clone reference for a repository. */
export function grcCloneUrl(region: string, name: string): string {
	return `codecommit::${region}::${name}`;
}

/** Builds the region-aware AWS console URL for a repository. */
export function consoleUrlForRepository(region: string, name: string): string {
	return `https://${region}.console.aws.amazon.com/codesuite/codecommit/repositories/${encodeURIComponent(name)}/browse`;
}

/** Copies a clone URL (https or grc) for the repository to the clipboard. */
export async function copyCloneUrlCommand(kind: 'https' | 'grc', node?: TreeNode): Promise<void> {
	const service = getService();
	const repositoryName = await requireRepositoryNode(node);
	const details = await withProgress(`Loading '${repositoryName}'...`, () => service.getRepository(repositoryName));

	const url = kind === 'https' ? details.cloneUrlHttp : grcCloneUrl(service.region ?? '', repositoryName);
	if (!url || url.length === 0) {
		notifyInfo(`No ${kind.toUpperCase()} clone URL is available for '${repositoryName}'.`);
		return;
	}
	await vscode.env.clipboard.writeText(url);
	notifySuccess(`Copied ${kind.toUpperCase()} clone URL for '${repositoryName}'.`);
}

/** Opens the AWS console page for the repository in the configured region. */
export async function openRepositoryCommand(node?: TreeNode): Promise<void> {
	const service = getService();
	const repositoryName = await requireRepositoryNode(node);
	const region = service.region ?? '';
	const url = consoleUrlForRepository(region, repositoryName);
	await vscode.env.openExternal(vscode.Uri.parse(url));
	notifyInfo(`Opened the AWS console for '${repositoryName}'.`);
}

/** Shows repository metadata in a copyable quick pick. */
export async function repositoryDetailsCommand(node?: TreeNode): Promise<void> {
	const service = getService();
	const repositoryName = await requireRepositoryNode(node);
	const details = await withProgress(`Loading '${repositoryName}'...`, () => service.getRepository(repositoryName));
	getTreeProvider().cacheRepositoryDetails(details);

	const entries: { label: string; detail: string; value: string }[] = [];
	const pushIf = (label: string, value: string | undefined): void => {
		if (value && value.length > 0) {
			entries.push({ label, detail: value, value });
		}
	};
	pushIf('Name', details.name || repositoryName);
	pushIf('ARN', details.arn);
	pushIf('Account ID', details.accountId);
	pushIf('Default Branch', details.defaultBranch);
	pushIf('HTTPS Clone URL', details.cloneUrlHttp);
	pushIf('GRC Clone URL', grcCloneUrl(service.region ?? '', repositoryName));

	const picked = await vscode.window.showQuickPick(
		entries.map((entry) => ({
			label: entry.label,
			description: entry.value === entry.detail ? '' : entry.detail,
			detail: entry.value,
		})),
		{
			title: `${repositoryName} — Repository Details`,
			placeHolder: 'Select an entry to copy its value',
			canPickMany: false,
		}
	);
	if (picked && picked.detail) {
		await vscode.env.clipboard.writeText(picked.detail);
		notifySuccess(`Copied ${picked.label} for '${repositoryName}'.`);
	}
}