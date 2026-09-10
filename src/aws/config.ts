/**
 * Reads extension configuration from VS Code settings.
 */
import * as vscode from 'vscode';

/** AWS connection settings consumed by the client factory. */
export interface AwsSettings {
	/** AWS region for CodeCommit, e.g. `us-east-1`. */
	region?: string;
	/** Named profile from the shared AWS config/credentials files. */
	profile?: string;
	/** Named profile configured with IAM Identity Center (SSO) credentials. */
	ssoProfile?: string;
	/** Maximum number of commits loaded when expanding branch history. */
	commitHistoryLimit: number;
}

/** The configuration section contributed by this extension. */
export const CONFIG_SECTION = 'aws-codecommit-manager';

/** Reads and validates the AWS settings for a configuration scope. */
export function getAwsSettings(scope?: vscode.ConfigurationScope): AwsSettings {
	const config = vscode.workspace.getConfiguration(CONFIG_SECTION, scope);
	const region = (config.get<string>('region') ?? '').trim();
	const profile = (config.get<string>('profile') ?? '').trim();
	const ssoProfile = (config.get<string>('ssoProfile') ?? '').trim();
	let limit = config.get<number>('commitHistoryLimit');
	if (typeof limit !== 'number' || Number.isNaN(limit)) {
		limit = 100;
	}
	return {
		region: region.length > 0 ? region : undefined,
		profile: profile.length > 0 ? profile : undefined,
		ssoProfile: ssoProfile.length > 0 ? ssoProfile : undefined,
		commitHistoryLimit: Math.max(1, Math.min(10000, Math.floor(limit))),
	};
}