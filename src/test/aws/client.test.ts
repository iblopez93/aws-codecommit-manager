import * as assert from 'assert';

import { createCodeCommitClient, getActiveProfile, isConnected } from '../../aws/client';
import { AwsSettings } from '../../aws/config';

const settings: AwsSettings = { commitHistoryLimit: 100 };

suite('aws/client', () => {
	test('getActiveProfile prefers the SSO profile', () => {
		assert.strictEqual(getActiveProfile({ ...settings, profile: 'shared', ssoProfile: 'sso' }), 'sso');
	});

	test('getActiveProfile falls back to the shared profile', () => {
		assert.strictEqual(getActiveProfile({ ...settings, profile: 'shared' }), 'shared');
	});

	test('getActiveProfile uses default when no profile is configured', () => {
		assert.strictEqual(getActiveProfile(settings), 'default');
	});

	test('createCodeCommitClient installs an explicit credential provider', () => {
		const client = createCodeCommitClient({ ...settings, profile: 'shared' });
		assert.strictEqual(typeof client.config.credentials, 'function');
		assert.strictEqual(client.config.profile, 'shared');
	});

	test('isConnected resolves credentials from the environment', async () => {
		const previous = {
			accessKey: process.env.AWS_ACCESS_KEY_ID,
			secretKey: process.env.AWS_SECRET_ACCESS_KEY,
			sessionToken: process.env.AWS_SESSION_TOKEN,
		};
		process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
		process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
		delete process.env.AWS_SESSION_TOKEN;

		try {
			assert.strictEqual(await isConnected(settings), true);
		} finally {
			if (previous.accessKey === undefined) {
				delete process.env.AWS_ACCESS_KEY_ID;
			} else {
				process.env.AWS_ACCESS_KEY_ID = previous.accessKey;
			}
			if (previous.secretKey === undefined) {
				delete process.env.AWS_SECRET_ACCESS_KEY;
			} else {
				process.env.AWS_SECRET_ACCESS_KEY = previous.secretKey;
			}
			if (previous.sessionToken !== undefined) {
				process.env.AWS_SESSION_TOKEN = previous.sessionToken;
			}
		}
	});
});
