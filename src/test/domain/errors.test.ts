import * as assert from 'assert';

import { AppError, formatAppError, normalizeError } from '../../domain/errors';

suite('domain/errors', () => {
	test('AppError instances pass through unchanged', () => {
		const appError = new AppError('boom', { kind: 'config', code: 'C1' });
		assert.strictEqual(normalizeError(appError), appError);
	});

	test('unknown errors are normalized', () => {
		const appError = normalizeError(new Error('weird failure'));
		assert.strictEqual(appError.kind, 'unknown');
		assert.match(appError.message, /weird failure/);
	});

	test('credential failures are classified as credentials', () => {
		const appError = normalizeError(new Error('CredentialsProviderError: no credentials available'));
		assert.strictEqual(appError.kind, 'credentials');
	});

	test('network failures are classified as network', () => {
		const appError = normalizeError(new Error('Connection refused ECONNREFUSED'));
		assert.strictEqual(appError.kind, 'network');
	});

	test('non-error values normalize to a readable message', () => {
		const appError = normalizeError(42);
		assert.match(appError.message, /42/);
	});

	test('region and profile are propagated into normalized errors', () => {
		const appError = normalizeError(new Error('something broke'), { region: 'eu-west-1', profile: 'dev' });
		assert.strictEqual(appError.region, 'eu-west-1');
		assert.strictEqual(appError.profile, 'dev');
	});

	test('formatAppError combines message with a hint', () => {
		const appError = new AppError('The request failed.', {
			kind: 'codecommit',
			code: 'RepositoryDoesNotExistException',
			hint: 'The repository does not exist or access is denied.',
		});
		const formatted = formatAppError(appError);
		assert.match(formatted, /The request failed\./);
		assert.match(formatted, /The repository does not exist or access is denied\./);
	});
});