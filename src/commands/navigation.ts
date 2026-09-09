/**
 * Navigation commands: refresh and load-more-commits.
 */
import { getTreeProvider } from '../state';
import { TreeNode } from '../tree/nodes';

/** Refreshes the whole view or a single node. */
export function refreshCommand(element?: TreeNode): void {
	getTreeProvider().refresh(element);
}

/** Loads the next batch of commits into a branch history. */
export async function loadMoreCommitsCommand(element?: TreeNode): Promise<void> {
	if (element === undefined) {
		return;
	}
	await getTreeProvider().loadMoreCommits(element);
}