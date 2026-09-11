import * as assert from 'assert';

import * as vscode from 'vscode';

import { CodeCommitService } from '../../services/codeCommitService';
import {
	ConflictDecision,
	ConflictInfo,
	RemoteFileSystemProvider,
	RemoteFileUri,
	RemoteTipCache,
	isCommitSpecifier,
} from '../../tree/remoteFileContentProvider';

const COMMIT_TIP = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const NEXT_TIP = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const COMMIT_PINNED = 'cccccccccccccccccccccccccccccccccccccccc';

interface ServiceStubs {
	getBranch?: (repositoryName: string, branchName: string) => Promise<{ name: string; commitId?: string }>;
	putFile?: (options: {
		repositoryName: string;
		branchName: string;
		parentCommitId: string;
		filePath: string;
		fileContent: Uint8Array;
		commitMessage?: string;
	}) => Promise<{ commitId: string }>;
}

/** Builds a service mock that records putFile calls and serves the stubs. */
function createMockService(stubs: ServiceStubs = {}): { service: CodeCommitService; putFiles: unknown[] } {
	const putFiles: unknown[] = [];
	const service = {
		getBranch: stubs.getBranch ?? (async () => ({ name: 'main', commitId: COMMIT_TIP })),
		getFile: async (_repository: string, _specifier: string, filePath: string) => ({
			path: filePath,
			commitId: COMMIT_TIP,
			content: new TextEncoder().encode('original'),
			size: 9,
		}),
		putFile:
			stubs.putFile ??
			(async (options: { filePath: string; fileContent: Uint8Array }) => {
				putFiles.push(options);
				return { commitId: NEXT_TIP };
			}),
	} as unknown as CodeCommitService;
	return { service, putFiles };
}

suite('tree/remoteFileSystemProvider', () => {
	suite('tip cache', () => {
		test('keys are the document uri so different files stay independent', () => {
			const cache = new RemoteTipCache();
			const first = RemoteFileUri.build('repo', 'main', 'src/first.ts');
			const second = RemoteFileUri.build('repo', 'main', 'src/second.ts');
			cache.set(first, COMMIT_TIP);
			cache.set(second, NEXT_TIP);
			assert.strictEqual(cache.get(first), COMMIT_TIP);
			assert.strictEqual(cache.get(second), NEXT_TIP);
		});

		test('delete forgets the captured tip', () => {
			const cache = new RemoteTipCache();
			const uri = RemoteFileUri.build('repo', 'main', 'src/file.ts');
			cache.set(uri, COMMIT_TIP);
			cache.delete(uri);
			assert.strictEqual(cache.get(uri), undefined);
		});

		test('isCommitSpecifier distinguishes pinned revisions from branches', () => {
			assert.strictEqual(isCommitSpecifier(COMMIT_PINNED), true);
			assert.strictEqual(isCommitSpecifier('main'), false);
		});
	});

	suite('read', () => {
		test('returns the fetched bytes and captures the branch tip', async () => {
			const { service } = createMockService();
			const provider = new RemoteFileSystemProvider(service);
			const uri = RemoteFileUri.build('repo', 'main', 'src/file.ts');
			const content = await provider.readFile(uri);
			assert.strictEqual(new TextDecoder().decode(content), 'original');
			assert.strictEqual(provider.tips.get(uri), COMMIT_TIP);
		});

		test('does not capture a tip for commit-pinned documents', async () => {
			const { service } = createMockService();
			const provider = new RemoteFileSystemProvider(service);
			const uri = RemoteFileUri.build('repo', 'main', 'src/file.ts', COMMIT_PINNED);
			await provider.readFile(uri);
			assert.strictEqual(provider.tips.get(uri), undefined);
		});
	});

	suite('write', () => {
		test('saves with the captured tip as parent when the tip is unchanged', async () => {
			const { service, putFiles } = createMockService();
			const provider = new RemoteFileSystemProvider(service);
			const uri = RemoteFileUri.build('repo', 'main', 'src/file.ts');
			await provider.readFile(uri);
			await provider.writeFile(uri, new TextEncoder().encode('updated'), { create: true, overwrite: true });
			assert.strictEqual(putFiles.length, 1);
			assert.strictEqual((putFiles[0] as { parentCommitId: string }).parentCommitId, COMMIT_TIP);
			assert.strictEqual(provider.tips.get(uri), NEXT_TIP);
		});

		test('reports a moved tip and overwrites only when the user confirms', async () => {
			const decisions: ConflictDecision[] = ['cancel', 'overwrite'];
			const { service, putFiles } = createMockService({
				getBranch: async () => ({ name: 'main', commitId: NEXT_TIP }),
			});
			const seen: ConflictInfo[] = [];
			const provider = new RemoteFileSystemProvider(service, {
				resolveConflict: async (info) => {
					seen.push(info);
					return decisions.shift() ?? 'cancel';
				},
			});
			const uri = RemoteFileUri.build('repo', 'main', 'src/file.ts');
			await provider.readFile(uri);

			// User declines to overwrite: nothing is uploaded, editor content is kept.
			await provider.writeFile(uri, new TextEncoder().encode('updated'), { create: true, overwrite: true });
			assert.strictEqual(putFiles.length, 0);
			assert.strictEqual(seen.length, 1);
			assert.strictEqual(seen[0].openTip, COMMIT_TIP);
			assert.strictEqual(seen[0].currentTip, NEXT_TIP);

			// User confirms the overwrite: the current tip becomes the parent.
			await provider.writeFile(uri, new TextEncoder().encode('updated'), { create: true, overwrite: true });
			assert.strictEqual(putFiles.length, 1);
			assert.strictEqual((putFiles[0] as { parentCommitId: string }).parentCommitId, NEXT_TIP);
		});

		test('blocks saving documents pinned to a commit specifier', async () => {
			const { service, putFiles } = createMockService();
			const provider = new RemoteFileSystemProvider(service);
			const uri = RemoteFileUri.build('repo', 'main', 'src/file.ts', COMMIT_PINNED);
			await assert.rejects(
				provider.writeFile(uri, new TextEncoder().encode('updated'), { create: true, overwrite: true }),
				/read-only/
			);
			assert.strictEqual(putFiles.length, 0);
		});
	});

	suite('diff helpers', () => {
		test('findLocalCandidates matches by basename case-insensitively', () => {
			const { findLocalCandidates } = require('../../commands/remoteDiff');
			const remotePath = 'src/app/SERVER.md';
			const files = [
				vscode.Uri.file('/ws/server.md'),
				vscode.Uri.file('/ws/other/readme.md'),
				vscode.Uri.file('/ws/sub/dir/SERVER.md'),
			];
			assert.deepStrictEqual(findLocalCandidates(remotePath, files), [files[0], files[2]]);
		});

		test('findLocalCandidates returns empty when the local file is missing', () => {
			const { findLocalCandidates } = require('../../commands/remoteDiff');
			const files = [vscode.Uri.file('/ws/unrelated.ts')];
			assert.strictEqual(findLocalCandidates('src/absent.md', files).length, 0);
		});
	});
});
