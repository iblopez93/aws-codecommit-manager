import * as assert from 'assert';
import * as path from 'path';

import {
	basename,
	combineEntryPath,
	dirname,
	isInsideWorkspace,
	joinRemotePath,
	toForwardSlashes,
	toRemotePath,
} from '../../domain/paths';

suite('domain/paths', () => {
	test('toForwardSlashes converts backslashes', () => {
		assert.strictEqual(toForwardSlashes('a\\b\\c.txt'), 'a/b/c.txt');
		assert.strictEqual(toForwardSlashes('a/b/c.txt'), 'a/b/c.txt');
	});

	test('toRemotePath maps a nested file relative to the workspace root', () => {
		const workspace = path.join('C:', 'repo');
		const file = path.join(workspace, 'src', 'main.ts');
		assert.strictEqual(toRemotePath(file, workspace), 'src/main.ts');
	});

	test('toRemotePath maps a root-level file', () => {
		const workspace = path.join('C:', 'repo');
		const file = path.join(workspace, 'README.md');
		assert.strictEqual(toRemotePath(file, workspace), 'README.md');
	});

	test('isInsideWorkspace accepts files inside and rejects files outside', () => {
		const workspace = path.join('C:', 'repo');
		assert.strictEqual(isInsideWorkspace(path.join(workspace, 'a.txt'), workspace), true);
		assert.strictEqual(isInsideWorkspace(workspace, workspace), true);
		assert.strictEqual(isInsideWorkspace(path.join('C:', 'other', 'a.txt'), workspace), false);
	});

	test('basename returns the final segment', () => {
		assert.strictEqual(basename('src/main.ts'), 'main.ts');
		assert.strictEqual(basename('README.md'), 'README.md');
		assert.strictEqual(basename('src/'), 'src');
	});

	test('dirname returns the parent or empty string for root files', () => {
		assert.strictEqual(dirname('src/main.ts'), 'src');
		assert.strictEqual(dirname('README.md'), '');
		assert.strictEqual(dirname('a/b/c.txt'), 'a/b');
	});

	test('joinRemotePath joins and cleans segments', () => {
		assert.strictEqual(joinRemotePath('a', 'b', 'c.txt'), 'a/b/c.txt');
		assert.strictEqual(joinRemotePath('a/', '/b/', 'c.txt'), 'a/b/c.txt');
	});

	test('combineEntryPath strips leading slashes from absolute entries', () => {
		assert.strictEqual(combineEntryPath('', '/README.md'), 'README.md');
		assert.strictEqual(combineEntryPath('src', '/src/main.ts'), 'src/main.ts');
	});
});