import * as assert from 'assert';

import {
	buildDetailLines,
	changeTypeIcon,
} from '../../ui/pullRequestDetails';
import { PullRequestInfo } from '../../domain/types';

suite('ui/pullRequestDetails', () => {
	const pullRequest: PullRequestInfo = {
		pullRequestId: '7',
		title: 'Add feature',
		status: 'OPEN',
		repositoryName: 'repo',
		sourceReference: 'refs/heads/feature',
		destinationReference: 'refs/heads/main',
		sourceCommit: 'src-commit',
		destinationCommit: 'dst-commit',
		authorArn: 'arn:aws:iam::1:user/alice',
		creationDate: new Date('2026-09-10T00:00:00Z'),
		description: 'Fixes the thing',
	};

	test('buildDetailLines exposes title, status, author, date, description', () => {
		const lines = buildDetailLines(pullRequest);
		assert.strictEqual(lines.title, '#7 Add feature');
		assert.strictEqual(lines.status, 'OPEN');
		assert.strictEqual(lines.author, 'arn:aws:iam::1:user/alice');
		assert.strictEqual(lines.description, 'Fixes the thing');
		assert.ok(lines.creationDate.includes('2026-09-10'));
	});

	test('changeTypeIcon maps change types to short labels', () => {
		assert.strictEqual(changeTypeIcon('A'), 'A');
		assert.strictEqual(changeTypeIcon('D'), 'D');
		assert.strictEqual(changeTypeIcon('M'), 'M');
	});
});
