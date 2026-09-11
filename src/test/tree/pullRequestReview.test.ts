import * as assert from 'assert';

import { buildChangedFileSides } from '../../commands/pullRequestReview';
import { AppError } from '../../domain/errors';
import { groupComments } from '../../domain/mappers';
import { CommentInfo, DifferenceInfo, PullRequestInfo } from '../../domain/types';
import { buildPanelHtml, escapeHtml, renderComment } from '../../ui/pullRequestDetailsPanel';

const SOURCE_COMMIT = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const DEST_COMMIT = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

const pullRequest: PullRequestInfo = {
	pullRequestId: '7',
	title: 'Add feature',
	status: 'OPEN',
	authorArn: 'arn:aws:sts::123:assumed-role/Dev/alice',
	repositoryName: 'repo',
	sourceReference: 'refs/heads/feature',
	destinationReference: 'refs/heads/main',
	sourceCommit: SOURCE_COMMIT,
	destinationCommit: DEST_COMMIT,
	creationDate: new Date('2026-01-02T03:04:05Z'),
	description: 'A description',
};

const modified: DifferenceInfo = { path: 'src/app.ts', changeType: 'M', beforeBlobId: 'b1', afterBlobId: 'a1' };

suite('tree/pullRequestReview', () => {
	suite('buildChangedFileSides', () => {
		test('renders the missing side empty for added and deleted files', () => {
			const deleted = buildChangedFileSides({
				kind: 'changedFile',
				repositoryName: 'repo',
				pullRequest,
				difference: { path: 'gone.ts', changeType: 'D', beforeBlobId: 'b1' },
			});
			assert.strictEqual(deleted.destination.toString().includes(DEST_COMMIT), true);
			assert.strictEqual(deleted.source.toString().includes('0'.repeat(40)), true);

			const added = buildChangedFileSides({
				kind: 'changedFile',
				repositoryName: 'repo',
				pullRequest,
				difference: { path: 'new.ts', changeType: 'A', afterBlobId: 'a1' },
			});
			assert.strictEqual(added.destination.toString().includes('0'.repeat(40)), true);
		});

		test('throws when the pull request has no commits', () => {
			assert.throws(
				() =>
					buildChangedFileSides({
						kind: 'changedFile',
						repositoryName: 'repo',
						pullRequest: { ...pullRequest, sourceCommit: undefined, destinationCommit: undefined },
						difference: modified,
					}),
				AppError
			);
		});
	});

	suite('details panel', () => {
		test('escapes user-provided text in html and comments', () => {
			assert.strictEqual(escapeHtml('<b>"x"&y</b>'), '&lt;b&gt;&quot;x&quot;&amp;y&lt;/b&gt;');
		});

		test('renderComment shows author, location, and escaped content', () => {
			const comment: CommentInfo = {
				commentId: 'c1',
				content: 'Fix <this> & that',
				authorArn: 'arn:aws:iam::123:user/bob',
				location: { filePath: 'src/app.ts', filePosition: 42, relativeFileVersion: 'AFTER' },
			};
			const html = renderComment(comment);
			assert.strictEqual(html.includes('bob'), true);
			assert.strictEqual(html.includes('src/app.ts'), true);
			assert.strictEqual(html.includes('Fix &lt;this&gt; &amp; that'), true);
		});

		test('buildPanelHtml renders metadata and the comment thread', () => {
			const html = buildPanelHtml(pullRequest, [
				{ commentId: 'c1', content: 'hello', authorArn: 'arn:aws:iam::123:user/bob' },
			]);
			assert.strictEqual(html.includes('#7 Add feature'), true);
			assert.strictEqual(html.includes('OPEN'), true);
			assert.strictEqual(html.includes('main ← feature'), true);
			assert.strictEqual(html.includes('hello'), true);
			const empty = buildPanelHtml(pullRequest, []);
			assert.strictEqual(empty.includes('No review comments yet.'), true);
		});
	});

	suite('groupComments', () => {
		test('groups by file and line and keeps general comments together', () => {
			const comments: CommentInfo[] = [
				{ commentId: '1', content: 'a', authorArn: 'x', location: { filePath: 'f.ts', filePosition: 1, relativeFileVersion: 'AFTER' } },
				{ commentId: '2', content: 'b', authorArn: 'x', location: { filePath: 'f.ts', filePosition: 1, relativeFileVersion: 'AFTER' } },
				{ commentId: '3', content: 'c', authorArn: 'x', location: { filePath: 'g.ts', filePosition: 9, relativeFileVersion: 'AFTER' } },
				{ commentId: '4', content: 'general', authorArn: 'x' },
			];
			const groups = groupComments(comments);
			assert.strictEqual(groups.length, 3);
			assert.deepStrictEqual(groups.map((g) => g.key), ['f.ts:1', 'g.ts:9', 'general']);
			assert.strictEqual(groups[0].comments.length, 2);
		});
	});
});
