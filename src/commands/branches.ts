/**
 * Branch commands: create, delete, and set default branch.
 */
import { getService, getTreeProvider } from '../state';
import { TreeNode } from '../tree/nodes';
import { CancelledError, confirmAction, inputText, notifySuccess, pickBranch } from './prompts';
import { refreshBranch, requireBranchTip, requireRepositoryName, withProgress } from './common';

/** Creates a branch from an existing branch. */
export async function createBranchCommand(node?: TreeNode): Promise<void> {
	const service = getService();
	const repositoryName = await requireRepositoryName(service, node);

	let sourceBranchName: string;
	if (node?.kind === 'branch') {
		sourceBranchName = node.branch.name;
	} else {
		const picked = await pickBranch(service, repositoryName, 'Create branch from');
		if (picked === undefined) {
			throw new CancelledError();
		}
		sourceBranchName = picked;
	}

	const input = await inputText('New branch name', {
		placeHolder: 'feature/my-change',
		title: 'Create Branch',
	});
	if (input === undefined || input.trim().length === 0) {
		throw new CancelledError();
	}
	const newBranchName = input.trim();

	await withProgress(`Creating branch '${newBranchName}'...`, async () => {
		const tip = await requireBranchTip(service, repositoryName, sourceBranchName);
		await service.createBranch(repositoryName, newBranchName, tip);
	});

	notifySuccess(`Branch '${newBranchName}' created from '${sourceBranchName}'.`);
	getTreeProvider().refresh();
}

/** Deletes a branch after confirmation. */
export async function deleteBranchCommand(node?: TreeNode): Promise<void> {
	if (node?.kind !== 'branch') {
		return;
	}
	const service = getService();
	const repositoryName = node.repositoryName;
	const branchName = node.branch.name;

	const confirmed = await confirmAction(
		`Delete branch '${branchName}'?`,
		'Deleted branches cannot be restored.'
	);
	if (!confirmed) {
		return;
	}

	await withProgress(`Deleting branch '${branchName}'...`, () =>
		service.deleteBranch(repositoryName, branchName)
	);

	notifySuccess(`Branch '${branchName}' deleted.`);
	getTreeProvider().refresh({
		kind: 'repository',
		repository: { name: repositoryName },
	});
}

/** Sets the branch as the repository default branch after confirmation. */
export async function setDefaultBranchCommand(node?: TreeNode): Promise<void> {
	if (node?.kind !== 'branch') {
		return;
	}
	const service = getService();
	const repositoryName = node.repositoryName;
	const branchName = node.branch.name;

	const confirmed = await confirmAction(
		`Set '${branchName}' as the default branch?`,
		'The repository default branch changes for the whole team.'
	);
	if (!confirmed) {
		return;
	}

	await withProgress(`Setting default branch...`, () =>
		service.setDefaultBranch(repositoryName, branchName)
	);

	notifySuccess(`'${branchName}' is now the default branch of '${repositoryName}'.`);
	getTreeProvider().refresh({
		kind: 'repository',
		repository: { name: repositoryName },
	});
}