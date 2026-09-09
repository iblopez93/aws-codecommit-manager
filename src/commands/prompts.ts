/**
 * Shared input/confirmation helpers used by command handlers.
 */
import * as vscode from 'vscode';

/** Thrown when the user cancels an interactive prompt. */
export class CancelledError extends Error {
	constructor() {
		super('Cancelled');
	}
}

/** Shows an input box. Returns undefined when cancelled. */
export async function inputText(
	prompt: string,
	options?: {
		placeHolder?: string;
		value?: string;
		validate?: (value: string) => string | undefined;
		title?: string;
	}
): Promise<string | undefined> {
	return vscode.window.showInputBox({
		prompt,
		title: options?.title,
		placeHolder: options?.placeHolder,
		value: options?.value,
		validateInput: (value: string) => {
			if (options?.validate) {
				return options.validate(value);
			}
			return value.trim().length === 0 ? 'A value is required.' : undefined;
		},
	});
}

/** Shows an input box and throws CancelledError when the user cancels. */
export async function requireText(
	prompt: string,
	options?: { placeHolder?: string; value?: string; validate?: (value: string) => string | undefined }
): Promise<string> {
	const value = await inputText(prompt, options);
	if (value === undefined) {
		throw new CancelledError();
	}
	return value.trim();
}

/** Picks a branch from the repository and returns its name, or undefined. */
export async function pickBranch(
	service: { listBranches(repositoryName: string): Promise<{ name: string; commitId?: string }[]> },
	repositoryName: string,
	title: string,
	exclude?: string
): Promise<string | undefined> {
	const branches = await service.listBranches(repositoryName);
	const items = branches
		.filter((branch) => branch.name !== exclude)
		.map((branch) => ({ label: branch.name, branchName: branch.name }));
	if (items.length === 0) {
		await vscode.window.showWarningMessage(`Repository '${repositoryName}' has no other branches to choose from.`);
		return undefined;
	}
	const picked = await vscode.window.showQuickPick(items, { title, placeHolder: 'Select a branch' });
	return picked?.branchName;
}

/** Asks for a yes/no confirmation. Returns false when declined. */
export async function confirmAction(message: string, detail?: string): Promise<boolean> {
	const answer = await vscode.window.showWarningMessage(message, { modal: true, detail }, 'Proceed');
	return answer === 'Proceed';
}

/** Shows a success notification. */
export function notifySuccess(message: string): void {
	void vscode.window.showInformationMessage(message);
}