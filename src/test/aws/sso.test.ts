import * as assert from 'assert';

import { buildProfileSection, computeCacheFileName } from '../../aws/sso';

suite('aws/sso', () => {
	test('computeCacheFileName returns sha1 hash with json extension', () => {
		const fileName = computeCacheFileName('https://d-abc123.awsapps.com/start');
		assert.strictEqual(fileName.endsWith('.json'), true);
		assert.strictEqual(fileName.includes('.'), true);
		assert.ok(fileName.length > 5);
	});

	test('computeCacheFileName is deterministic for same input', () => {
		const a = computeCacheFileName('https://example.com/start');
		const b = computeCacheFileName('https://example.com/start');
		assert.strictEqual(a, b);
	});

	test('computeCacheFileName differs for different inputs', () => {
		const a = computeCacheFileName('https://example.com/start-a');
		const b = computeCacheFileName('https://example.com/start-b');
		assert.notStrictEqual(a, b);
	});

	test('buildProfileSection formats all SSO fields', () => {
		const section = buildProfileSection(
			'my-sso-profile',
			'https://d-abc123.awsapps.com/start',
			'us-east-1',
			'123456789012',
			'AdministratorAccess'
		);
		assert.match(section, /\[profile my-sso-profile\]/);
		assert.match(section, /sso_start_url = https:\/\/d-abc123\.awsapps\.com\/start/);
		assert.match(section, /sso_region = us-east-1/);
		assert.match(section, /sso_account_id = 123456789012/);
		assert.match(section, /sso_role_name = AdministratorAccess/);
	});

	test('buildProfileSection includes all required keys', () => {
		const section = buildProfileSection('p', 'url', 'r', '123456789012', 'role');
		assert.ok(section.includes('sso_start_url'));
		assert.ok(section.includes('sso_region'));
		assert.ok(section.includes('sso_account_id'));
		assert.ok(section.includes('sso_role_name'));
	});
});
