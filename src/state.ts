/**
 * Shared extension state so command handlers and the activation flow can
 * access the current service and tree provider without circular imports.
 */
import { AppError } from './domain/errors';
import { CodeCommitService } from './services/codeCommitService';
import { CodeCommitTreeProvider } from './tree/codeCommitTreeProvider';

let service: CodeCommitService | undefined;
let treeProvider: CodeCommitTreeProvider | undefined;

export function setService(value: CodeCommitService): void {
	service = value;
}

export function getService(): CodeCommitService {
	if (!service) {
		throw new AppError('The AWS CodeCommit service is not initialized.', { kind: 'config' });
	}
	return service;
}

export function setTreeProvider(value: CodeCommitTreeProvider): void {
	treeProvider = value;
}

export function getTreeProvider(): CodeCommitTreeProvider {
	if (!treeProvider) {
		throw new AppError('The AWS CodeCommit tree is not initialized.', { kind: 'config' });
	}
	return treeProvider;
}