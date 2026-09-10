/**
 * AWS connection configuration command. Stores region/profile in VS Code
 * settings (never access keys) and recreates the client.
 */
import * as vscode from 'vscode';

import { CONFIG_SECTION, getAwsSettings } from '../aws/config';
import { createCodeCommitService } from '../services/awsCodeCommitService';
import { getTreeProvider, setService } from '../state';
import { inputText, requireText } from './prompts';
import { createSsoProfile, performSsoLogin, SsoLoginError } from '../aws/sso';
import { updateStatusBar } from '../ui/statusBar';

/** The configure command handler. */
export async function configureCommand(): Promise<void> {
	const settings = getAwsSettings();
	const region = await inputText('AWS CodeCommit region', {
		placeHolder: 'us-east-1',
		value: settings.region ?? '',
		validate: validateRegion,
		title: 'Configure AWS CodeCommit',
	});
	if (region === undefined) {
		return;
	}
	const profile = await inputText('AWS profile (optional)', {
		placeHolder: 'default',
		value: settings.profile ?? '',
		title: 'Configure AWS CodeCommit',
	});
	if (profile === undefined) {
		return;
	}

	const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
	await config.update('region', region || undefined, vscode.ConfigurationTarget.Global);
	await config.update('profile', profile || undefined, vscode.ConfigurationTarget.Global);

	reloadService();
	const suffix = profile.length > 0 ? ` and profile '${profile}'` : '';
	void vscode.window.showInformationMessage(`AWS CodeCommit configured for region '${region}'${suffix}.`);
}

/** Validates an AWS region value (empty allowed to use defaults). */
export function validateRegion(value: string): string | undefined {
	const trimmed = value.trim();
	if (trimmed === '') {
		return undefined;
	}
	return /^[a-z]{2}(?:-[a-z0-9]+)+-\d+$/.test(trimmed)
		? undefined
		: 'Expected a region like us-east-1.';
}

/** Recreates the service and rebinds the tree after settings changes. */
export function reloadService(): void {
	const nextService = createCodeCommitService(getAwsSettings());
	setService(nextService);
	getTreeProvider().updateService(nextService);
}

/** The login command handler. Performs IAM Identity Center SSO login. */
export async function loginCommand(): Promise<void> {
	const startUrl = await requireText('IAM Identity Center start URL', {
		placeHolder: 'https://d-abc123.awsapps.com/start',
		validate: (value) => {
			const trimmed = value.trim();
			if (!trimmed.startsWith('https://') && !trimmed.startsWith('http://')) {
				return 'Expected a URL like https://d-abc123.awsapps.com/start.';
			}
			return undefined;
		},
	});
	const region = await requireText('AWS region for SSO', {
		placeHolder: 'us-east-1',
		validate: validateRegion,
	});

	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: 'AWS CodeCommit Login',
			cancellable: true,
		},
		async (progress, token) => {
			progress.report({ message: 'Registering client and starting device authorization...' });
			const result = await performSsoLogin(startUrl, region);
			if (result instanceof SsoLoginError) {
				await vscode.window.showErrorMessage(`Login failed — ${result.message}`);
				await updateStatusBar();
				return;
			}
			progress.report({ message: 'Authorization received. Configuring profile...' });
			const accountId = await requireText('AWS Account ID', {
				placeHolder: '123456789012',
				validate: (value) => {
					return /^\d{12}$/.test(value.trim()) ? undefined : 'Expected a 12-digit AWS account ID.';
				},
			});
			if (accountId === undefined) {
				return;
			}
			const roleName = await requireText('IAM Role name', {
				placeHolder: 'AWSAdministratorAccess',
			});
			if (roleName === undefined) {
				return;
			}
			const profileName = await requireText('Profile name for this SSO session', {
				placeHolder: 'sso-profile',
				validate: (value) => {
					return value.trim().length > 0 ? undefined : 'A profile name is required.';
				},
			});
			if (profileName === undefined) {
				return;
			}
			await createSsoProfile(profileName, startUrl, region, accountId, roleName);
			const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
			await config.update('ssoProfile', profileName, vscode.ConfigurationTarget.Global);
			reloadService();
			await updateStatusBar();
			await vscode.window.showInformationMessage(
				`AWS CodeCommit: Connected as '${profileName}'. Credentials cached and profile created.`
			);
			void result;
			token.isCancellationRequested = true;
		}
	);
}