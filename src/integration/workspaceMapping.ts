/**
 * Maps workspace git repositories to CodeCommit remote repositories using the
 * built-in vscode.git extension. Pure helpers (filtering and ambiguity
 * selection) are separated so they stay unit testable without VS Code.
 */
import * as vscode from 'vscode';

import { parseCodeCommitRemoteUrl } from './codeCommitUrls';

/** A workspace folder resolved to a CodeCommit repository. */
export interface WorkspaceMapping {
	folderUri: vscode.Uri;
	repositoryName: string;
	/** Checked-out branch name, when the repository has one. */
	branchName?: string;
	/** The CodeCommit region parsed from the remote URL, when present. */
	region?: string;
}

/** Minimal remote shape the mapping works on (kept structural for tests). */
export interface RemoteLike {
	name: string;
	fetchUrl: string;
	pushUrl: string;
}

/** Minimal repository shape the mapping works on (kept structural for tests). */
export interface GitRepositoryLike {
	rootUri: vscode.Uri;
	state?: { HEAD?: { name?: string } };
	remotes?: RemoteLike[];
}

/** Maps a git repository to a CodeCommit mapping, or undefined when none of its remotes is CodeCommit. */
export function mapGitRepository(
	repository: Pick<GitRepositoryLike, 'rootUri' | 'state' | 'remotes'>
): WorkspaceMapping | undefined {
	const remotes = repository.remotes ?? [];
	for (const remote of remotes) {
		const parsed = parseCodeCommitRemoteUrl(remote.fetchUrl) ?? parseCodeCommitRemoteUrl(remote.pushUrl);
		if (parsed) {
			return {
				folderUri: repository.rootUri,
				repositoryName: parsed.repositoryName,
				branchName: repository.state?.HEAD?.name || undefined,
				region: parsed.region || undefined,
			};
		}
	}
	return undefined;
}

/** Maps every git repository, keeping only CodeCommit-backed folders. */
export function mapAllGitRepositories(repositories: readonly GitRepositoryLike[]): WorkspaceMapping[] {
	return repositories
		.map(mapGitRepository)
		.filter((mapping): mapping is WorkspaceMapping => mapping !== undefined);
}

/**
 * Builds quick-pick items to disambiguate several folders that map to
 * different CodeCommit repositories (task 3.3).
 */
export function buildFolderDisambiguationItems(mappings: readonly WorkspaceMapping[]): {
	label: string;
	description: string;
	mapping: WorkspaceMapping;
}[] {
	return mappings.map((mapping) => {
		const folderName = mapping.folderUri.path.split('/').filter(Boolean).pop() ?? mapping.folderUri.fsPath;
		const detail = mapping.branchName ? `${mapping.repositoryName} @ ${mapping.branchName}` : mapping.repositoryName;
		return {
			label: `$(folder) ${folderName}`,
			description: detail,
			mapping,
		};
	});
}

interface GitApiLike {
	repositories?: GitRepositoryLike[];
}

interface GitExtensionLike {
	getAPI(version: number): GitApiLike;
}

/**
 * Resolves the CodeCommit mapping for a workspace folder (or the whole
 * workspace when no uri is given) by activating vscode.git lazily. Returns
 * undefined gracefully when git is unavailable or nothing maps to CodeCommit.
 * When several folders map to different repositories, the user picks one.
 */
export async function resolveWorkspaceMapping(uri?: vscode.Uri): Promise<WorkspaceMapping | undefined> {
	let repositories: GitRepositoryLike[];
	try {
		const extension = vscode.extensions.getExtension<GitExtensionLike>('vscode.git');
		if (!extension) {
			return undefined;
		}
		const git = extension.isActive ? extension.exports : await extension.activate();
		repositories = git.getAPI(1).repositories ?? [];
	} catch {
		// vscode.git failed to activate (e.g. git missing): degrade gracefully.
		return undefined;
	}

	const mappings = mapAllGitRepositories(repositories);
	if (mappings.length === 0) {
		return undefined;
	}
	const scoped = uri ? mappings.filter((mapping) => mapping.folderUri.toString() === uri.toString()) : [];
	if (scoped.length > 0) {
		return scoped[0];
	}
	if (mappings.length === 1) {
		return mappings[0];
	}
	const uniqueRepositories = new Set(mappings.map((mapping) => mapping.repositoryName));
	if (uniqueRepositories.size === 1) {
		return mappings[0];
	}
	const picked = await vscode.window.showQuickPick(buildFolderDisambiguationItems(mappings), {
		title: 'Several folders map to CodeCommit',
		placeHolder: 'Select the folder to use',
	});
	return picked?.mapping;
}
