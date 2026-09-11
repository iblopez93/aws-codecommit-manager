import * as assert from 'assert';

import { buildErrorActionSpecs } from '../../ui/actionableErrors';

suite('ui/actionableErrors', () => {
	test('credential errors offer Login and Configure', () => {
		const specs = buildErrorActionSpecs('credentials', true);
		assert.deepStrictEqual(
			specs.map((spec) => ({ title: spec.title, command: spec.command })),
			[
				{ title: 'Login', command: 'aws-codecommit-manager.login' },
				{ title: 'Configure', command: 'aws-codecommit-manager.configure' },
			]
		);
	});

	test('config errors offer Open Settings and Show Logs', () => {
		const specs = buildErrorActionSpecs('config', true);
		assert.deepStrictEqual(
			specs.map((spec) => spec.title),
			['Open Settings', 'Show Logs']
		);
	});

	test('network errors offer Retry when a retry closure is available', () => {
		const withRetry = buildErrorActionSpecs('network', true);
		assert.strictEqual(withRetry[0].isRetry, true);
		assert.deepStrictEqual(
			withRetry.map((spec) => spec.title),
			['Retry', 'Show Logs']
		);
		const withoutRetry = buildErrorActionSpecs('network', false);
		assert.deepStrictEqual(
			withoutRetry.map((spec) => spec.title),
			['Show Logs']
		);
	});

	test('codecommit and unknown kinds fall back to Show Logs', () => {
		for (const kind of ['codecommit', 'unknown'] as const) {
			const specs = buildErrorActionSpecs(kind, true);
			assert.strictEqual(specs.length, 1);
			assert.strictEqual(specs[0].isShowLogs, true);
		}
	});
});
