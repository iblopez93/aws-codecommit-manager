import * as assert from 'assert';

import {
	compactArn,
	mapBranchNames,
	mapComments,
	mapCommit,
	mapFile,
	mapFolder,
	mapPullRequest,
	mapRepositoryNameIdPair,
	normalizePath,
	shortId,
} from '../../domain/mappers';

suite('domain/mappers', () => {
	test('normalizePath strips leading slashes', () => {
		assert.strictEqual(normalizePath('/src/main.ts'), 'src/main.ts');
		assert.strictEqual(normalizePath('README.md'), 'README.md');
	});

	test('mapRepositoryNameIdPair maps names and ids', () => {
		const repository = mapRepositoryNameIdPair({ repositoryName: 'app', repositoryId: 'id-1' });
		assert.strictEqual(repository.name, 'app');
		assert.strictEqual(repository.id, 'id-1');
	});

	test('mapBranchNames maps branch names', () => {
		const branches = mapBranchNames(['main', 'feature/x']);
		assert.strictEqual(branches.length, 2);
		assert.strictEqual(branches[0].name, 'main');
		assert.strictEqual(branches[0].commitId, undefined);
	});

	test('mapFolder maps folders and files and strips leading slashes', () => {
		const folder = mapFolder({
			commitId: 'abc',
			folderPath: '/',
			treeId: 'tree1',
			subFolders: [{ absolutePath: '/public', relativePath: 'public', treeId: 't' }],
			files: [{ absolutePath: '/README.md', relativePath: 'README.md', blobId: 'b1', fileMode: 'NORMAL' }],
			symbolicLinks: [],
			subModules: [],
		});
		assert.strictEqual(folder.commitId, 'abc');
		assert.strictEqual(folder.path, '');
		assert.strictEqual(folder.subFolders[0].path, 'public');
		assert.strictEqual(folder.files[0].path, 'README.md');
	});

	test('mapFile defaults missing content to an empty buffer', () => {
		const file = mapFile({
			filePath: '/a.txt',
			commitId: 'c',
			blobId: undefined,
			fileMode: undefined,
			fileContent: undefined,
			fileSize: 4,
		});
		assert.strictEqual(file.path, 'a.txt');
		assert.strictEqual(file.content.length, 0);
		assert.strictEqual(file.size, 4);
	});

	test('mapCommit maps fields', () => {
		const info = mapCommit({
			commitId: 'abc123',
			message: 'msg',
			parents: ['p'],
			author: { name: 'A', email: 'a@x', date: 'd' },
		});
		assert.strictEqual(info.commitId, 'abc123');
		assert.strictEqual(info.parents.length, 1);
		assert.strictEqual(info.authorName, 'A');
	});

	test('mapPullRequest picks the first target and maps status', () => {
		const pr = mapPullRequest({
			pullRequestId: '7',
			title: 't',
			pullRequestStatus: 'CLOSED',
			pullRequestTargets: [
				{
					repositoryName: 'r',
					sourceReference: 'refs/heads/a',
					destinationReference: 'refs/heads/b',
					sourceCommit: 's',
					destinationCommit: 'd',
				},
			],
		});
		assert.strictEqual(pr.status, 'CLOSED');
		assert.strictEqual(pr.sourceReference, 'refs/heads/a');
		assert.strictEqual(pr.destinationCommit, 'd');
	});

	test('mapComments flattens grouped comments with locations', () => {
		const comments = mapComments({
			commentsForPullRequestData: [
				{
					location: { filePath: 'a.ts', filePosition: 3, relativeFileVersion: 'AFTER' },
					comments: [
						{ commentId: 'c1', content: 'x', authorArn: 'arn:aws:iam::1:user/u1' },
						{ commentId: 'c2', content: 'y' },
					],
				},
			],
		});
		assert.strictEqual(comments.length, 2);
		assert.strictEqual(comments[0].location?.filePath, 'a.ts');
		assert.strictEqual(comments[0].authorArn, 'arn:aws:iam::1:user/u1');
		assert.strictEqual(comments[1].location?.filePath, 'a.ts');
	});

	test('shortId truncates long ids', () => {
		assert.strictEqual(shortId('12345678'), '12345678');
		assert.strictEqual(shortId('1234567890', 8), '12345678');
	});

	test('compactArn returns the user-like suffix', () => {
		assert.strictEqual(compactArn('arn:aws:iam::123:user/jane'), 'jane');
		assert.strictEqual(compactArn(undefined), '');
	});
});