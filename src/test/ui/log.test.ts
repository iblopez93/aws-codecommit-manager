import * as assert from 'assert';

import { formatLogLine, redact } from '../../ui/log';

suite('ui/log', () => {
	suite('redact', () => {
		test('redacts access key ids', () => {
			assert.strictEqual(
				redact('using key AKIAIOSFODNN7EXAMPLE today'),
				'using key [REDACTED ACCESS KEY] today'
			);
		});

		test('redacts secret assignment in config files', () => {
			assert.strictEqual(
				redact('aws_secret_access_key = wJalrXUtnFEMIexample'),
				'aws_secret_access_key = [REDACTED]'
			);
		});

		test('redacts token style assignments', () => {
			assert.strictEqual(redact('session token: "verylongsecret"'), 'session token=[REDACTED]');
		});

		test('redacts private key blocks', () => {
			const block = '-----BEGIN RSA PRIVATE KEY-----\nMIIEow...\n-----END RSA PRIVATE KEY-----';
			assert.strictEqual(redact(`pem: ${block}`), 'pem: [REDACTED KEY]');
		});

		test('leaves normal log content untouched', () => {
			const line = 'aws-codecommit-manager.listRepositories succeeded (120ms)';
			assert.strictEqual(redact(line), line);
		});
	});

	suite('formatLogLine', () => {
		test('includes timestamp, level, operation, and duration', () => {
			const line = formatLogLine('INFO', 'op', 'succeeded', 42);
			assert.match(line, /^\[\d{4}-\d{2}-\d{2}T/);
			assert.ok(line.includes('[INFO] op (42ms): succeeded'));
		});

		test('omits duration when not provided', () => {
			const line = formatLogLine('ERROR', 'op', 'boom');
			assert.ok(line.includes('[ERROR] op: boom'));
			assert.ok(!line.includes('ms)'));
		});
	});
});
