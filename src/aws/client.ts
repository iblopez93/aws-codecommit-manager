/**
 * AWS client creation from extension settings. Credentials are resolved by the
 * SDK default provider chain (environment, shared config/credentials files,
 * SSO, instance metadata) — no access keys are ever stored in VS Code settings.
 */
import { CodeCommitClient, CodeCommitClientConfig } from '@aws-sdk/client-codecommit';

import { AwsSettings } from './config';

/** Creates a CodeCommit client for the given settings. */
export function createCodeCommitClient(settings: AwsSettings): CodeCommitClient {
	const config: CodeCommitClientConfig = {};
	if (settings.region) {
		config.region = settings.region;
	}
	if (settings.profile) {
		config.profile = settings.profile;
	}
	return new CodeCommitClient(config);
}