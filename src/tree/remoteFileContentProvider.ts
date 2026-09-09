/**
 * Read-only text document provider that exposes CodeCommit files to VS Code
 * through the `codecommit-remote` URI scheme. Content is fetched on demand
 * with GetFile and presented as a normal text document.
 */
import * as vscode from 'vscode';

import { CodeCommitService } from '../services/codeCommitService';
import { AppError } from '../domain/errors';

/** URI scheme used for remote CodeCommit documents. */
export const REMOTE_FILE_SCHEME = 'codecommit-remote';

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

/** Decodes file bytes as UTF-8 text or reports binary content. */
export function decodeRemoteContent(content: Uint8Array, size: number): string {
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(content);
	} catch {
		return `[Binary file, ${size} bytes — content cannot be displayed as text.]`;
	}
}

/** TextDocumentContentProvider for the codecommit-remote scheme. */
export class RemoteFileContentProvider implements vscode.TextDocumentContentProvider {
	constructor(private readonly service: CodeCommitService) {}

	async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
		const { repositoryName, specifier, filePath } = RemoteFileUri.parse(uri);
		const file = await this.service.getFile(repositoryName, specifier, filePath);
		return decodeRemoteContent(file.content, file.size);
	}
}