/**
 * AWS client creation from extension settings. Credentials are resolved by the
 * SDK default provider chain (environment, shared config/credentials files,
 * SSO, instance metadata) — no access keys are ever stored in VS Code settings.
 *
 * When an SSO profile is configured, credentials are resolved using fromSSO.
 * Otherwise, the default provider chain is used.
 */
import { CodeCommitClient, CodeCommitClientConfig } from '@aws-sdk/client-codecommit';
import { fromSSO } from '@aws-sdk/credential-providers';

import { AwsSettings } from './config';

/** Creates a CodeCommit client for the given settings. */
export function createCodeCommitClient(settings: AwsSettings): CodeCommitClient {
	const config: CodeCommitClientConfig = {};
	if (settings.region) {
		config.region = settings.region;
	}
	if (settings.ssoProfile) {
		config.credentials = fromSSO({ profile: settings.ssoProfile });
	} else if (settings.profile) {
		config.profile = settings.profile;
	}
	return new CodeCommitClient(config);
}

/**
 * Checks whether valid AWS credentials can be resolved for the given settings.
 * Returns true if credentials are available, false otherwise.
 */
export async function isConnected(settings?: AwsSettings): Promise<boolean> {
	try {
		const client = createCodeCommitClient(settings ?? { commitHistoryLimit: 100 });
		const credentials = (client.config as any).credentials;
		if (typeof credentials === 'function') {
			try {
				const result = await credentials();
				return !!result;
			} catch {
				return false;
			}
		}
		return !!credentials;
	} catch {
		return false;
	}
}