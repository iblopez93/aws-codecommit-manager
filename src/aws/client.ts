/**
 * AWS client creation from extension settings. Credentials are resolved by the
 * SDK default provider chain (environment, shared config/credentials files,
 * SSO, instance metadata) — no access keys are ever stored in VS Code settings.
 *
 * When an SSO profile is configured, credentials are resolved using fromSSO.
 * Otherwise, the default provider chain is used.
 */
import { CodeCommitClient, CodeCommitClientConfig } from '@aws-sdk/client-codecommit';
import { fromNodeProviderChain, fromSSO } from '@aws-sdk/credential-providers';

import { AwsSettings } from './config';

/** The profile shown when the default credential chain is used. */
const DEFAULT_PROFILE_NAME = 'default';

/**
 * Creates the credential provider for the given settings. SSO profiles are
 * resolved explicitly; all other settings use the SDK Node provider chain.
 */
function createCredentialProvider(settings: AwsSettings) {
	if (settings.ssoProfile) {
		return fromSSO({ profile: settings.ssoProfile });
	}
	return fromNodeProviderChain({ profile: settings.profile });
}

/** Creates a CodeCommit client for the given settings. */
export function createCodeCommitClient(settings: AwsSettings): CodeCommitClient {
	const config: CodeCommitClientConfig = {};
	if (settings.region) {
		config.region = settings.region;
	}
	if (settings.profile) {
		config.profile = settings.profile;
	}
	config.credentials = createCredentialProvider(settings);
	return new CodeCommitClient(config);
}

/** Returns the profile name that credential resolution is scoped to. */
export function getActiveProfile(settings: AwsSettings): string {
	return settings.ssoProfile ?? settings.profile ?? DEFAULT_PROFILE_NAME;
}

/**
 * Checks whether valid AWS credentials can be resolved for the given settings.
 * Returns true if credentials are available, false otherwise.
 */
export async function isConnected(settings: AwsSettings): Promise<boolean> {
	try {
		const credentials = await createCredentialProvider(settings)();
		return Boolean(credentials.accessKeyId && credentials.secretAccessKey);
	} catch {
		return false;
	}
}