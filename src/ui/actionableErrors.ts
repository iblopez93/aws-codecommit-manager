/**
 * Actionable error presentation: maps each AppError kind to recovery actions
 * (login, configure, retry, show logs) and shows them as message buttons.
 */
import * as vscode from 'vscode';

import { AppError, formatAppError } from '../domain/errors';
import { log } from './log';

/** One recovery action offered next to an error message. */
export interface ErrorAction {
	title: string;
	run: () => Promise<void> | void;
}

/** A pure description of the actions for a kind (testable without VS Code). */
export interface ErrorActionSpec {
	title: string;
	command?: string;
	/** Set when the action is the caller-provided retry closure. */
	isRetry?: boolean;
	isShowLogs?: boolean;
}

/**
 * Kind-to-action mapping:
 * - credentials → Login + Configure
 * - config → Open Settings + Show Logs
 * - network → Retry + Show Logs
 * - codecommit/unknown → Show Logs
 */
export function buildErrorActionSpecs(kind: AppError['kind'], withRetry: boolean): ErrorActionSpec[] {
	switch (kind) {
		case 'credentials':
			return [
				{ title: 'Login', command: 'aws-codecommit-manager.login' },
				{ title: 'Configure', command: 'aws-codecommit-manager.configure' },
			];
		case 'config':
			return [
				{ title: 'Open Settings', command: 'workbench.action.openSettings' },
				{ title: 'Show Logs', isShowLogs: true },
			];
		case 'network':
			return [
				...(withRetry ? [{ title: 'Retry', isRetry: true } as ErrorActionSpec] : []),
				{ title: 'Show Logs', isShowLogs: true },
			];
		default:
			return [{ title: 'Show Logs', isShowLogs: true }];
	}
}

/** Shows an AppError with its kind-mapped recovery actions. */
export async function showAppError(
	error: AppError,
	options?: { retry?: () => Promise<void> }
): Promise<void> {
	const specs = buildErrorActionSpecs(error.kind, options?.retry !== undefined);
	if (specs.length === 0) {
		void vscode.window.showErrorMessage(formatAppError(error));
		return;
	}
	log('ERROR', 'actionable-error', `${error.kind}: ${error.message}`);
	const picked = await vscode.window.showErrorMessage(
		formatAppError(error),
		{ modal: false },
		...specs.map((spec) => spec.title)
	);
	const spec = specs.find((candidate) => candidate.title === picked);
	if (spec === undefined) {
		return;
	}
	if (spec.isRetry && options?.retry) {
		await options.retry();
		return;
	}
	if (spec.isShowLogs) {
		await vscode.commands.executeCommand('aws-codecommit-manager.showLogs');
		return;
	}
	if (spec.command) {
		await vscode.commands.executeCommand(spec.command);
	}
}
