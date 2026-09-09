/**
 * AWS connection configuration command. Stores region/profile in VS Code
 * settings (never access keys) and recreates the client.
 */
import * as vscode from 'vscode';

import { CONFIG_SECTION, getAwsSettings } from '../aws/config';
import { createCodeCommitService } from '../services/awsCodeCommitService';
import { getTreeProvider, setService } from '../state';
import { inputText } from './prompts';

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