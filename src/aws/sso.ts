/**
 * AWS IAM Identity Center SSO authentication using OAuth 2.0 Device Authorization Grant (RFC 8628).
 *
 * Reference: AWS Toolkit for VS Code SSO login flow.
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { CreateTokenCommand, RegisterClientCommand, SSOOIDCClient, StartDeviceAuthorizationCommand } from '@aws-sdk/client-sso-oidc';

/** Client registration name used for the OIDC device flow. */
const CLIENT_NAME = 'aws-codecommit-manager';
/** Client type for the OIDC registration. */
const CLIENT_TYPE = 'public';

/** Result of a successful SSO login. */
export interface SsoLoginResult {
	accessToken: string;
	expiresAt: string;
	startUrl: string;
	region: string;
}

/** Result of starting device authorization. */
export interface DeviceAuthorization {
	deviceCode: string;
	userCode: string;
	verificationUri: string;
	verificationUriComplete: string;
	interval: number;
	expiresIn: number;
}

/** Custom error for SSO login failures. */
export class SsoLoginError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SsoLoginError';
	}
}

/**
 * Creates an SSO OIDC client configured for the given region.
 */
function createClient(region: string): SSOOIDCClient {
	return new SSOOIDCClient({ region });
}

/**
 * Registers an OIDC client for the device authorization flow.
 */
export async function registerClient(client: SSOOIDCClient): Promise<{ clientId: string; clientSecret: string }> {
	const command = new RegisterClientCommand({
		clientName: CLIENT_NAME,
		clientType: CLIENT_TYPE,
	});
	const response = await client.send(command);
	if (!response.clientId || !response.clientSecret) {
		throw new SsoLoginError('Failed to register OIDC client: missing credentials in response.');
	}
	return {
		clientId: response.clientId,
		clientSecret: response.clientSecret,
	};
}

/**
 * Starts the device authorization flow, returning the device code and user verification URL.
 */
export async function startDeviceAuthorization(
	client: SSOOIDCClient,
	clientId: string,
	clientSecret: string,
	startUrl: string
): Promise<DeviceAuthorization> {
	const command = new StartDeviceAuthorizationCommand({
		clientId,
		clientSecret,
		startUrl,
	});
	const response = await client.send(command);
	if (!response.deviceCode || !response.userCode || !response.verificationUri) {
		throw new SsoLoginError('Failed to start device authorization: incomplete response.');
	}
	return {
		deviceCode: response.deviceCode,
		userCode: response.userCode,
		verificationUri: response.verificationUri,
		verificationUriComplete: response.verificationUriComplete ?? response.verificationUri,
		interval: response.interval ?? 5,
		expiresIn: response.expiresIn ?? 600,
	};
}

/**
 * Polls the token endpoint until the user approves or the device code expires.
 */
export async function pollForToken(
	client: SSOOIDCClient,
	clientId: string,
	clientSecret: string,
	deviceCode: string,
	interval: number,
	expiresIn: number
): Promise<{ accessToken: string; expiresIn: number }> {
	const deadline = Date.now() + expiresIn * 1000;
	const delayMs = interval * 1000;

	while (Date.now() < deadline) {
		await new Promise((resolve) => setTimeout(resolve, delayMs));
		try {
			const command = new CreateTokenCommand({
				clientId,
				clientSecret,
				deviceCode,
				grantType: 'urn:ietf:params:oauth:grant-type:device_code',
			});
			const response = await client.send(command);
			if (response.accessToken) {
				return {
					accessToken: response.accessToken,
					expiresIn: response.expiresIn ?? 3600,
				};
			}
		} catch (error: any) {
			if (error.name === 'AuthorizationPendingException') {
				continue;
			}
			if (error.name === 'SlowDownException') {
				await new Promise((resolve) => setTimeout(resolve, delayMs));
				continue;
			}
			if (error.name === 'ExpiredTokenException') {
				throw new SsoLoginError('The device code has expired. Please try again.');
			}
			if (error.name === 'AccessDeniedException') {
				throw new SsoLoginError('Authorization was denied. Please approve the request in your browser.');
			}
			throw error;
		}
	}
	throw new SsoLoginError('Login timed out. Please try again and approve the request in your browser.');
}

/**
 * Computes the SHA-1 hash of the start URL, used as the SSO cache file name.
 */
export function computeCacheFileName(startUrl: string): string {
	return `${crypto.createHash('sha1').update(startUrl).digest('hex')}.json`;
}

/**
 * Returns the path to the AWS SSO cache directory.
 */
export function getSsoCacheDir(): string {
	return path.join(os.homedir(), '.aws', 'sso', 'cache');
}

/**
 * Caches the SSO access token in the standard AWS SSO cache format.
 */
export async function cacheToken(startUrl: string, region: string, accessToken: string, expiresIn: number): Promise<string> {
	const cacheDir = getSsoCacheDir();
	if (!fs.existsSync(cacheDir)) {
		fs.mkdirSync(cacheDir, { recursive: true });
	}
	const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
	const cacheEntry = {
		accessToken,
		expiresAt,
		region,
		startUrl,
	};
	const fileName = computeCacheFileName(startUrl);
	const filePath = path.join(cacheDir, fileName);
	await fs.promises.writeFile(filePath, JSON.stringify(cacheEntry, null, 2), 'utf-8');
	return filePath;
}

/**
 * Reads a cached SSO token from disk, returning null if not found or expired.
 */
export async function readCachedToken(startUrl: string): Promise<{ accessToken: string; expiresAt: string } | null> {
	const fileName = computeCacheFileName(startUrl);
	const filePath = path.join(getSsoCacheDir(), fileName);
	try {
		const content = await fs.promises.readFile(filePath, 'utf-8');
		const entry = JSON.parse(content);
		if (!entry.accessToken || !entry.expiresAt) {
			return null;
		}
		if (new Date(entry.expiresAt).getTime() <= Date.now()) {
			return null;
		}
		return { accessToken: entry.accessToken, expiresAt: entry.expiresAt };
	} catch {
		return null;
	}
}

/**
 * Returns the path to the AWS config file.
 */
export function getAwsConfigPath(): string {
	return path.join(os.homedir(), '.aws', 'config');
}

/**
 * Builds a profile section string for the AWS config file.
 */
export function buildProfileSection(
	profileName: string,
	startUrl: string,
	region: string,
	accountId: string,
	roleName: string
): string {
	return [
		`[profile ${profileName}]`,
		`sso_start_url = ${startUrl}`,
		`sso_region = ${region}`,
		`sso_account_id = ${accountId}`,
		`sso_role_name = ${roleName}`,
	].join('\n');
}

/**
 * Creates or updates a named SSO profile in ~/.aws/config.
 */
export async function createSsoProfile(
	profileName: string,
	startUrl: string,
	region: string,
	accountId: string,
	roleName: string
): Promise<void> {
	const configPath = getAwsConfigPath();
	let existing = '';
	if (fs.existsSync(configPath)) {
		existing = await fs.promises.readFile(configPath, 'utf-8');
	}
	const profileSection = buildProfileSection(profileName, startUrl, region, accountId, roleName);
	const updated = upsertProfileSection(existing, profileName, profileSection);
	const configDir = path.dirname(configPath);
	if (!fs.existsSync(configDir)) {
		fs.mkdirSync(configDir, { recursive: true });
	}
	await fs.promises.writeFile(configPath, updated, 'utf-8');
}

/**
 * Inserts or replaces a profile section in the config file content.
 */
function upsertProfileSection(content: string, profileName: string, section: string): string {
	const header = `[profile ${profileName}]`;
	const lines = content.split('\n');
	const startIdx = lines.findIndex((line) => line.trim() === header);
	if (startIdx === -1) {
		const suffix = content.endsWith('\n') || content === '' ? '' : '\n';
		return content + suffix + '\n' + section + '\n';
	}
	let endIdx = startIdx + 1;
	while (endIdx < lines.length && !lines[endIdx].startsWith('[')) {
		endIdx++;
	}
	lines.splice(startIdx, endIdx - startIdx, ...section.split('\n'));
	return lines.join('\n');
}

/**
 * Orchestrates the complete SSO login flow.
 */
export async function performSsoLogin(startUrl: string, region: string): Promise<SsoLoginResult | SsoLoginError> {
	try {
		const client = createClient(region);
		const { clientId, clientSecret } = await registerClient(client);
		const deviceAuth = await startDeviceAuthorization(client, clientId, clientSecret, startUrl);
		const token = await pollForToken(client, clientId, clientSecret, deviceAuth.deviceCode, deviceAuth.interval, deviceAuth.expiresIn);
		const cachePath = await cacheToken(startUrl, region, token.accessToken, token.expiresIn);
		void cachePath;
		return {
			accessToken: token.accessToken,
			expiresAt: new Date(Date.now() + token.expiresIn * 1000).toISOString(),
			startUrl,
			region,
		};
	} catch (error) {
		if (error instanceof SsoLoginError) {
			return error;
		}
		return new SsoLoginError(error instanceof Error ? error.message : 'Unknown error during SSO login.');
	}
}
