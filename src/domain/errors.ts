/**
 * Error normalization for AWS SDK errors and unexpected failures. Produces
 * user-facing messages that include the CodeCommit exception code, the SDK
 * message, and the configured region/profile when relevant.
 */
import { CodeCommitServiceException } from '@aws-sdk/client-codecommit';

/** Broad category used to decide how an error is presented. */
export type AppErrorKind = 'codecommit' | 'credentials' | 'network' | 'config' | 'unknown';

/** An error that is safe and actionable to show to the user. */
export class AppError extends Error {
	readonly kind: AppErrorKind;
	readonly code?: string;
	readonly hint?: string;
	readonly region?: string;
	readonly profile?: string;
	readonly raw?: unknown;

	constructor(message: string, options?: {
		kind?: AppErrorKind;
		code?: string;
		hint?: string;
		region?: string;
		profile?: string;
		raw?: unknown;
		cause?: unknown;
	}) {
		super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
		this.kind = options?.kind ?? 'unknown';
		this.code = options?.code;
		this.hint = options?.hint;
		this.region = options?.region;
		this.profile = options?.profile;
		this.raw = options?.raw;
	}
}

/** Friendly hints for common CodeCommit exceptions surfaced by the SDK. */
const KNOWN_HINTS: Record<string, string> = {
	RepositoryDoesNotExistException: 'The repository does not exist or access is denied.',
	RepositoryNameRequiredException: 'A repository name is required.',
	InvalidRepositoryNameException: 'The repository name is not valid.',
	BranchDoesNotExistException: 'The branch does not exist or access is denied.',
	BranchNameExistsException: 'A branch with that name already exists.',
	BranchNameRequiredException: 'A branch name is required.',
	InvalidBranchNameException: 'The branch name is not valid for CodeCommit.',
	DefaultBranchCannotBeDeletedException: 'The default branch cannot be deleted.',
	CommitDoesNotExistException: 'The commit does not exist or the repository has no default branch.',
	CommitIdDoesNotExistException: 'The commit ID does not exist.',
	ParentCommitIdOutdatedException: 'The branch tip changed since this operation started. Refresh and try again.',
	FileDoesNotExistException: 'The file does not exist at the selected commit.',
	FolderDoesNotExistException: 'The folder does not exist at the selected commit.',
	FileTooLargeException: 'The file exceeds the CodeCommit size limit.',
	FileContentSizeLimitExceededException: 'The file content exceeds the CodeCommit size limit.',
	InvalidPathException: 'The repository path is not valid.',
	PathRequiredException: 'A repository path is required.',
	PullRequestDoesNotExistException: 'The pull request does not exist or access is denied.',
	PullRequestAlreadyClosedException: 'The pull request is already closed.',
	InvalidPullRequestStatusUpdateException: 'The only valid pull request status change is from OPEN to CLOSED.',
	InvalidPullRequestStatusException: 'The pull request status is not valid.',
	PullRequestApprovalRulesNotSatisfiedException: 'The pull request approval rules are not satisfied.',
};

/** Recognizes AWS credential resolution failures across SDK versions. */
function looksLikeCredentialFailure(error: Error): boolean {
	const name = (error as { name?: string }).name ?? '';
	const message = `${error.message ?? ''} ${name}`;
	return (
		message.includes('CredentialsProviderError') ||
		message.includes('credential') ||
		message.includes('AWS_PROFILE') ||
		message.includes('AWS_PROFILES') ||
		message.includes('profile') ||
		message.includes('identity') ||
		message.includes('Unauthenticated')
	);
}

/** Recognizes network/transport failures. */
function looksLikeNetworkFailure(error: Error): boolean {
	const message = error.message ?? '';
	return (
		message.includes('ECONNREFUSED') ||
		message.includes('ECONNRESET') ||
		message.includes('getaddrinfo') ||
		message.includes('timed out') ||
		message.includes('timeout') ||
		message.includes('connection') ||
		message.includes('stream') ||
		message.includes('fetch failed') ||
		message.includes('socket') ||
		message.includes('TLS')
	);
}

/** Normalizes any thrown value into an AppError. */
export function normalizeError(error: unknown, context?: { region?: string; profile?: string }): AppError {
	if (error instanceof AppError) {
		return error;
	}

	if (error instanceof CodeCommitServiceException) {
		const code = (error as { name?: string }).name ?? 'CodeCommitServiceException';
		const hint = KNOWN_HINTS[code];
		const detail = error.message || (error as { $metadata?: { message?: string } }).$metadata?.message || code;
		const parts = [`CodeCommit error: ${detail}`];
		if (code !== 'CodeCommitServiceException') {
			parts.push(`(${code})`);
		}
		if (context?.region) {
			parts.push(`region: ${context.region}`);
		}
		if (context?.profile) {
			parts.push(`profile: ${context.profile}`);
		}
		return new AppError(parts.join(' '), {
			kind: 'codecommit',
			code,
			hint,
			region: context?.region,
			profile: context?.profile,
			raw: error,
			cause: error,
		});
	}

	if (error instanceof Error) {
		if (looksLikeCredentialFailure(error)) {
			const suffix = context?.profile ? ` (profile: ${context.profile})` : '';
			return new AppError(`AWS credentials could not be resolved${suffix} — ${error.message}`, {
				kind: 'credentials',
				region: context?.region,
				profile: context?.profile,
				raw: error,
				cause: error,
			});
		}
		if (looksLikeNetworkFailure(error)) {
			return new AppError(`Network error while contacting AWS CodeCommit — ${error.message}`, {
				kind: 'network',
				region: context?.region,
				profile: context?.profile,
				raw: error,
				cause: error,
			});
		}
		return new AppError(error.message || String(error), {
			kind: 'unknown',
			region: context?.region,
			profile: context?.profile,
			raw: error,
			cause: error,
		});
	}

	return new AppError(`Unexpected error: ${String(error)}`, { kind: 'unknown', raw: error });
}

/** Renders an AppError as a short message with a hint when available. */
export function formatAppError(error: AppError): string {
	const parts = [error.message];
	if (error.hint && !error.message.includes(error.hint)) {
		parts.push(error.hint);
	}
	return parts.join('\n');
}