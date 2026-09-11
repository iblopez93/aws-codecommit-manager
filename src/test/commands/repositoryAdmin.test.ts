import * as assert from 'assert';

import { consoleUrlForRepository, grcCloneUrl } from '../../commands/repositoryAdmin';
import { buildRepositoryTooltip } from '../../tree/codeCommitTreeProvider';

suite('commands/repositoryAdmin', () => {
	test('grcCloneUrl builds the git-remote-codecommit reference', () => {
		assert.strictEqual(grcCloneUrl('eu-west-1', 'my-repo'), 'codecommit::eu-west-1::my-repo');
	});

	test('consoleUrlForRepository builds a region-aware console path', () => {
		assert.strictEqual(
			consoleUrlForRepository('us-east-1', 'demo/app'),
			'https://us-east-1.console.aws.amazon.com/codesuite/codecommit/repositories/demo%2Fapp/browse'
		);
	});
});

suite('tree/repositoryTooltip', () => {
	test('shows the name and id without cached details', () => {
		const tooltip = buildRepositoryTooltip('repo', 'abc123', undefined);
		assert.ok(tooltip.includes('repo'));
		assert.ok(tooltip.includes('abc123'));
	});

	test('includes cached ARN, account, default branch and HTTPS clone URL', () => {
		const tooltip = buildRepositoryTooltip('repo', 'abc123', {
			name: 'repo',
			id: 'abc123',
			arn: 'arn:aws:codecommit:us-east-1:123:repo',
			accountId: '123456789012',
			defaultBranch: 'main',
			cloneUrlHttp: 'https://git-codecommit.us-east-1.amazonaws.com/v1/repos/repo',
		});
		assert.ok(tooltip.includes('arn:aws:codecommit'));
		assert.ok(tooltip.includes('123456789012'));
		assert.ok(tooltip.includes('main'));
		assert.ok(tooltip.includes('git-codecommit.us-east-1'));
	});
});