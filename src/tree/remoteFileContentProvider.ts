/**
 * Writable file system provider that exposes CodeCommit files to VS Code
 * through the `codecommit-remote` URI scheme. Reads fetch content on demand
 * with GetFile; writes upload the document back with PutFile behind a branch
 * tip guard that prevents silently overwriting remote changes.
 */
import * as vscode from 'vscode';

import { AppError } from '../domain/errors';
import { shortId } from '../domain/mappers';
import { CodeCommitService } from '../services/codeCommitService';

/** URI scheme used for remote CodeCommit documents. */
export const REMOTE_FILE_SCHEME = 'codecommit-remote';

/** Full 40-character commit ids pin a revision; any other specifier is a branch. */
export function isCommitSpecifier(specifier: string): boolean {
	return /^[0-9a-f]{40}$/i.test(specifier);
}

/**
 * Virtual all-zero commit that renders as an empty document. Used on the
 * missing side of an added/deleted file diff instead of a real revision.
 */
export const EMPTY_COMMIT_ID = '0'.repeat(40);

/** Builds and parses `codecommit-remote` URIs. */
export class RemoteFileUri {
	/** The repository reference used to fetch the file (branch or commit). */
	static build(repositoryName: string, branchName: string, filePath: string, commitSpecifier?: string): vscode.Uri {
		const specifier = commitSpecifier || branchName;
		const payload = JSON.stringify({ repositoryName, specifier, filePath });
		return vscode.Uri.parse(`${REMOTE_FILE_SCHEME}:///${encodeURIComponent(payload)}`);
	}

	/** Parses a remote document uri back into its parts. */
	static parse(uri: vscode.Uri): { repositoryName: string; specifier: string; filePath: string } {
		const encoded = uri.path.replace(/^\/+/, '');
		try {
			const parsed = JSON.parse(decodeURIComponent(encoded));
			if (
				typeof parsed?.repositoryName !== 'string' ||
				typeof parsed?.specifier !== 'string' ||
				typeof parsed?.filePath !== 'string'
			) {
				throw new Error('invalid payload');
			}
			return parsed;
		} catch (error) {
			throw new AppError(`Invalid remote CodeCommit document uri: ${uri}`, {
				kind: 'config',
				raw: error,
				cause: error,
			});
		}
	}
}

/** Remembers the branch-tip commit id captured when a document was first read. */
export class RemoteTipCache {
	private readonly tips = new Map<string, string>();

	private static key(uri: vscode.Uri): string {
		return uri.toString();
	}

	/** Returns the tip captured at open time, if any. */
	get(uri: vscode.Uri): string | undefined {
		return this.tips.get(RemoteTipCache.key(uri));
	}

	/** Records the tip captured at open time. */
	set(uri: vscode.Uri, commitId: string): void {
		this.tips.set(RemoteTipCache.key(uri), commitId);
	}

	/** Forgets the captured tip (e.g. after the document was closed). */
	delete(uri: vscode.Uri): void {
		this.tips.delete(RemoteTipCache.key(uri));
	}
}

/** The user's choice when the branch tip moved since the document was opened. */
export type ConflictDecision = 'overwrite' | 'compare' | 'cancel';

/** Details about a detected moved-tip conflict. */
export interface ConflictInfo {
	uri: vscode.Uri;
	repositoryName: string;
	branchName: string;
	filePath: string;
	openTip: string;
	currentTip: string;
}

/** Default conflict flow: modal dialog with overwrite and compare-first options. */
export async function defaultConflictHandler(info: ConflictInfo): Promise<ConflictDecision> {
	const choice = await vscode.window.showWarningMessage(
		`The tip of branch '${info.branchName}' moved while '${info.filePath}' was open.`,
		{
			modal: true,
			detail:
				`Open tip ${shortId(info.openTip, 12)}, current tip ${shortId(info.currentTip, 12)}. ` +
				'Overwriting replaces the changes committed in between; comparing first shows both revisions.',
		},
		'Overwrite',
		'Compare First'
	);
	if (choice === 'Overwrite') {
		return 'overwrite';
	}
	if (choice === 'Compare First') {
		const openRevision = RemoteFileUri.build(info.repositoryName, info.branchName, info.filePath, info.openTip);
		const currentRevision = RemoteFileUri.build(info.repositoryName, info.branchName, info.filePath, info.currentTip);
		await vscode.commands.executeCommand(
			'vscode.diff',
			openRevision,
			currentRevision,
			`${info.filePath}: your open revision ↔ current tip`
		);
		return 'compare';
	}
	return 'cancel';
}

export interface RemoteFileSystemProviderOptions {
	/** Overrides the default moved-tip conflict handling (used by tests). */
	resolveConflict?: (info: ConflictInfo) => Promise<ConflictDecision>;
}

/** FileSystemProvider for the `codecommit-remote` scheme. */
export class RemoteFileSystemProvider implements vscode.FileSystemProvider {
	private readonly tipCache = new RemoteTipCache();
	private readonly sizes = new Map<string, number>();
	private readonly _onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
	readonly onDidChangeFile = this._onDidChangeFile.event;
	private readonly resolveConflict: (info: ConflictInfo) => Promise<ConflictDecision>;

	constructor(
		private readonly service: CodeCommitService,
		options?: RemoteFileSystemProviderOptions
	) {
		this.resolveConflict = options?.resolveConflict ?? defaultConflictHandler;
	}

	/** The tip cache used by this provider; exposed for tests and diagnostics. */
	get tips(): RemoteTipCache {
		return this.tipCache;
	}

	async readFile(uri: vscode.Uri): Promise<Uint8Array> {
		const { repositoryName, specifier, filePath } = RemoteFileUri.parse(uri);
		if (specifier === EMPTY_COMMIT_ID) {
			// Virtual empty revision for the missing side of an added/deleted diff.
			this.sizes.set(uri.toString(), 0);
			return new Uint8Array();
		}
		const file = await this.service.getFile(repositoryName, specifier, filePath);
		if (!isCommitSpecifier(specifier) && file.commitId) {
			this.tipCache.set(uri, file.commitId);
		}
		this.sizes.set(uri.toString(), file.size);
		return file.content;
	}

	async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
		return {
			type: vscode.FileType.File,
			ctime: 0,
			mtime: 0,
			size: this.sizes.get(uri.toString()) ?? 0,
		};
	}

	async writeFile(
		uri: vscode.Uri,
		content: Uint8Array,
		_options: { readonly create: boolean; readonly overwrite: boolean }
	): Promise<void> {
		const { repositoryName, specifier, filePath } = RemoteFileUri.parse(uri);
		if (isCommitSpecifier(specifier)) {
			throw vscode.FileSystemError.NoPermissions(
				`'${filePath}' is pinned to commit ${shortId(specifier, 12)} and is read-only. ` +
					'Open the file from a branch to edit it.'
			);
		}
		const branch = await this.service.getBranch(repositoryName, specifier);
		if (!branch.commitId) {
			throw new AppError(`Branch '${specifier}' has no tip commit; the file cannot be saved.`, {
				kind: 'codecommit',
			});
		}
		const currentTip = branch.commitId;
		const openTip = this.tipCache.get(uri);
		if (openTip !== undefined && openTip !== currentTip) {
			const decision = await this.resolveConflict({
				uri,
				repositoryName,
				branchName: specifier,
				filePath,
				openTip,
				currentTip,
			});
			if (decision !== 'overwrite') {
				// Keep the editor content untouched; nothing is uploaded.
				return;
			}
		}

		const result = await vscode.window.withProgress(
			{ location: vscode.ProgressLocation.Notification, title: `Saving '${filePath}' to CodeCommit...` },
			() =>
				this.service.putFile({
					repositoryName,
					branchName: specifier,
					parentCommitId: currentTip,
					filePath,
					fileContent: content,
					commitMessage: `Update ${filePath} (via AWS CodeCommit Manager)`,
				})
		);
		this.tipCache.set(uri, result.commitId);
		this._onDidChangeFile.fire([{ type: vscode.FileChangeType.Changed, uri }]);
	}

	readDirectory(): never {
		throw vscode.FileSystemError.NoPermissions(
			'Folder browsing is provided by the AWS CodeCommit tree view, not the file system provider.'
		);
	}

	createDirectory(): never {
		throw vscode.FileSystemError.NoPermissions(
			'Directories cannot be created directly; saving a file inside a path creates it.'
		);
	}

	delete(): never {
		throw vscode.FileSystemError.NoPermissions(
			'Use the "Delete Remote File" command in the AWS CodeCommit view to delete remote files.'
		);
	}

	rename(): never {
		throw vscode.FileSystemError.NoPermissions('Renaming remote CodeCommit files is not supported.');
	}

	watch(): vscode.Disposable {
		return new vscode.Disposable(() => {});
	}
}