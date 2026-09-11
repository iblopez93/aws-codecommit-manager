import * as assert from 'assert';

import * as vscode from 'vscode';

import { isCodeCommitRemoteUrl, parseCodeCommitRemoteUrl } from '../../integration/codeCommitUrls';
import { buildKeepOrChangeItems } from '../../integration/mappingDefaults';
import {
	buildFolderDisambiguationItems,
	GitRepositoryLike,
	mapAllGitRepositories,
	mapGitRepository,
} from '../../integration/workspaceMapping';

const HTTPS_URL = 'https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-repo';
const GRC_URL = 'codecommit::us-west-2:grc-repo';
const GRC_NO_REGION = 'codecommit::plain-repo';
const GITHUB_URL = 'https://github.com/acme/widget.git';

suite('integration/codeCommitUrls', () => {
	test('parses the HTTPS remote form', () => {
		assert.deepStrictEqual(parseCodeCommitRemoteUrl(HTTPS_URL), {
			region: 'us-east-1',
			repositoryName: 'my-repo',
		});
	});

	test('parses the GRC form with and without region', () => {
		assert.deepStrictEqual(parseCodeCommitRemoteUrl(GRC_URL), {
			region: 'us-west-2',
			repositoryName: 'grc-repo',
		});
		assert.deepStrictEqual(parseCodeCommitRemoteUrl(GRC_NO_REGION), {
			region: '',
			repositoryName: 'plain-repo',
		});
	});

	test('rejects non-CodeCommit and empty URLs', () => {
		assert.strictEqual(parseCodeCommitRemoteUrl(GITHUB_URL), undefined);
		assert.strictEqual(parseCodeCommitRemoteUrl(''), undefined);
		assert.strictEqual(parseCodeCommitRemoteUrl('git@gitlab.com:acme/widget.git'), undefined);
		assert.strictEqual(isCodeCommitRemoteUrl(GITHUB_URL), false);
		assert.strictEqual(isCodeCommitRemoteUrl(GRC_URL), true);
	});
});

suite('integration/workspaceMapping', () => {
	const folder = vscode.Uri.file('/workspaces/widget');

	test('maps a git repository whose remote is CodeCommit', () => {
		const repository: GitRepositoryLike = {
			rootUri: folder,
			state: { HEAD: { name: 'feature/x' } },
			remotes: [
				{ name: 'github', fetchUrl: GITHUB_URL, pushUrl: GITHUB_URL },
				{ name: 'origin', fetchUrl: HTTPS_URL, pushUrl: HTTPS_URL },
			],
		};
		const mapping = mapGitRepository(repository);
		assert.ok(mapping);
		assert.strictEqual(mapping.repositoryName, 'my-repo');
		assert.strictEqual(mapping.region, 'us-east-1');
		assert.strictEqual(mapping.branchName, 'feature/x');
		assert.strictEqual(mapping.folderUri.toString(), folder.toString());
	});

	test('falls back to the push URL and skips non-CodeCommit repositories', () => {
		const pushOnly: GitRepositoryLike = {
			rootUri: folder,
			remotes: [{ name: 'origin', fetchUrl: GITHUB_URL, pushUrl: GRC_URL }],
		};
		const mapping = mapGitRepository(pushOnly);
		assert.ok(mapping);
		assert.strictEqual(mapping.repositoryName, 'grc-repo');

		const unrelated: GitRepositoryLike = {
			rootUri: folder,
			remotes: [{ name: 'origin', fetchUrl: GITHUB_URL, pushUrl: GITHUB_URL }],
		};
		assert.strictEqual(mapGitRepository(unrelated), undefined);
	});

	test('keeps only CodeCommit-backed folders when mapping all repositories', () => {
		const codecommit: GitRepositoryLike = {
			rootUri: vscode.Uri.file('/workspaces/one'),
			state: { HEAD: { name: 'main' } },
			remotes: [{ name: 'origin', fetchUrl: HTTPS_URL, pushUrl: HTTPS_URL }],
		};
		const other: GitRepositoryLike = {
			rootUri: vscode.Uri.file('/workspaces/two'),
			remotes: [{ name: 'origin', fetchUrl: GITHUB_URL, pushUrl: GITHUB_URL }],
		};
		const mappings = mapAllGitRepositories([codecommit, other]);
		assert.strictEqual(mappings.length, 1);
		assert.strictEqual(mappings[0].repositoryName, 'my-repo');
	});

	test('builds disambiguation items showing folder names and repo/branch details', () => {
		const mappings = mapAllGitRepositories([
			{
				rootUri: vscode.Uri.file('/workspaces/alpha'),
				state: { HEAD: { name: 'main' } },
				remotes: [{ name: 'origin', fetchUrl: HTTPS_URL, pushUrl: HTTPS_URL }],
			},
			{
				rootUri: vscode.Uri.file('/workspaces/beta'),
				remotes: [{ name: 'origin', fetchUrl: GRC_URL, pushUrl: GRC_URL }],
			},
		]);
		const items = buildFolderDisambiguationItems(mappings);
		assert.strictEqual(items.length, 2);
		assert.ok(items[0].label.includes('alpha'));
		assert.strictEqual(items[0].description, 'my-repo @ main');
		assert.ok(items[1].label.includes('beta'));
		assert.strictEqual(items[1].description, 'grc-repo');
	});

	test('buildFolderDisambiguationItems handles a root path without folder segments', () => {
		const mapping = mapGitRepository({
			rootUri: vscode.Uri.file('/'),
			remotes: [{ name: 'origin', fetchUrl: HTTPS_URL, pushUrl: HTTPS_URL }],
		});
		assert.ok(mapping);
		const items = buildFolderDisambiguationItems([mapping]);
		assert.strictEqual(items.length, 1);
		assert.ok(items[0].label.length > 0);
	});
});

suite('integration/mappingDefaults', () => {
	test('puts the mapped default first, marked as default, without duplicates', () => {
		const items = buildKeepOrChangeItems('main', ['dev', 'main', 'release'], (value) => value);
		assert.strictEqual(items.length, 3);
		assert.strictEqual(items[0].value, 'main');
		assert.ok(items[0].label.startsWith('$(check)'));
		assert.ok(items[0].description!.includes('workspace mapping'));
		assert.deepStrictEqual(
			items.slice(1).map((item) => item.value),
			['dev', 'release']
		);
	});
});
