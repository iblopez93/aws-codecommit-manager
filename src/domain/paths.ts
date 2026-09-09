/**
 * Pure path helpers for mapping local workspace files to CodeCommit repository
 * paths. Kept free of VS Code and AWS imports so they are unit testable.
 */
import * as path from 'path';

/**
 * Normalizes a local path to the forward-slash form used by CodeCommit.
 * No-op on POSIX separators; on Windows converts backslashes.
 */
export function toForwardSlashes(localPath: string): string {
	return localPath.replace(/\\/g, '/');
}

/**
 * Computes the repository-relative path for a local file given the workspace
 * root both were derived from. Returns the path with forward slashes.
 */
export function toRemotePath(localPath: string, workspaceRoot: string): string {
	const relative = path.relative(workspaceRoot, localPath);
	return toForwardSlashes(relative);
}

/**
 * Returns true when the local path is inside the given workspace root.
 * Accepts either a file or folder path for the local path.
 */
export function isInsideWorkspace(localPath: string, workspaceRoot: string): boolean {
	const relative = path.relative(workspaceRoot, localPath);
	return (!relative.startsWith('..') && !path.isAbsolute(relative)) || relative === '';
}

/** Base name of a remote path (after the final forward slash). */
export function basename(remotePath: string): string {
	const normalized = toForwardSlashes(remotePath).replace(/\/+$/, '');
	const index = normalized.lastIndexOf('/');
	return index >= 0 ? normalized.substring(index + 1) : normalized;
}

/** Directory portion of a remote path ('' for a root-level file). */
export function dirname(remotePath: string): string {
	const normalized = toForwardSlashes(remotePath).replace(/\/+$/, '');
	const index = normalized.lastIndexOf('/');
	return index >= 0 ? normalized.substring(0, index) : '';
}

/** Joins remote path segments with forward slashes. */
export function joinRemotePath(...segments: string[]): string {
	return segments
		.filter((segment) => segment !== undefined && segment !== null && segment !== '')
		.map((segment) => toForwardSlashes(segment).replace(/^\/+|\/+$/g, ''))
		.join('/');
}

/**
 * Combines a folder path with a relative entry name into a full remote path.
 * Entry names are already absolutes from CodeCommit (e.g. 'src/main.ts'), in
 * which case they are returned unchanged.
 */
export function combineEntryPath(folderPath: string, entryAbsolutePath: string): string {
	if (entryAbsolutePath.startsWith('/')) {
		return toForwardSlashes(entryAbsolutePath).replace(/^\/+/, '');
	}
	return toForwardSlashes(entryAbsolutePath);
}