/**
 * AWS SDK v3 adapter implementing the CodeCommitService interface.
 */
import {
	CodeCommitClient,
	CreateBranchCommand,
	CreateCommitCommand,
	CreateCommitInput,
	CreatePullRequestCommand,
	DeleteBranchCommand,
	DeleteFileCommand,
	GetBranchCommand,
	GetCommitCommand,
	GetCommentsForPullRequestCommand,
	GetCommentsForPullRequestOutput,
	GetFileCommand,
	GetFolderCommand,
	GetPullRequestCommand,
	GetRepositoryCommand,
	ListBranchesCommand,
	ListPullRequestsCommand,
	ListRepositoriesCommand,
	PostCommentForPullRequestCommand,
	PutFileCommand,
	UpdateDefaultBranchCommand,
	UpdatePullRequestDescriptionCommand,
	UpdatePullRequestStatusCommand,
	UpdatePullRequestTitleCommand,
} from '@aws-sdk/client-codecommit';

import { AppError } from '../domain/errors';
import {
	mapBranchInfo,
	mapBranchNames,
	mapCommit,
	mapComments,
	mapFile,
	mapFolder,
	mapPullRequest,
	mapRepositoryMetadata,
	mapRepositoryNameIdPair,
} from '../domain/mappers';
import {
	BranchInfo,
	CommentInfo,
	CommitInfo,
	CommitResult,
	CreateCommitOptions,
	CreatePullRequestOptions,
	FileContent,
	FolderContents,
	PostCommentOptions,
	PullRequestInfo,
	PullRequestStatus,
	RepositoryDetails,
	RepositoryInfo,
} from '../domain/types';
import { createCodeCommitClient } from '../aws/client';
import { AwsSettings } from '../aws/config';
import { CodeCommitService } from './codeCommitService';

/** Ensures a branch name is a fully qualified git reference. */
function toFullyQualifiedReference(name: string): string {
	return name.startsWith('refs/') ? name : `refs/heads/${name}`;
}

/** AWS SDK adapter for the CodeCommitService interface. */
export class AwsCodeCommitService implements CodeCommitService {
	readonly region?: string;
	readonly profile?: string;

	constructor(
		private readonly client: CodeCommitClient,
		options?: { region?: string; profile?: string }
	) {
		this.region = options?.region;
		this.profile = options?.profile;
	}

	async listRepositories(): Promise<RepositoryInfo[]> {
		const repositories: RepositoryInfo[] = [];
		let nextToken: string | undefined;
		do {
			const output = await this.client.send(new ListRepositoriesCommand({ nextToken }));
			for (const pair of output.repositories ?? []) {
				repositories.push(mapRepositoryNameIdPair(pair));
			}
			nextToken = output.nextToken;
		} while (nextToken);
		return repositories;
	}

	async getRepository(repositoryName: string): Promise<RepositoryDetails> {
		const output = await this.client.send(new GetRepositoryCommand({ repositoryName }));
		return mapRepositoryMetadata(output.repositoryMetadata ?? {});
	}

	async listBranches(repositoryName: string): Promise<BranchInfo[]> {
		const names: string[] = [];
		let nextToken: string | undefined;
		do {
			const output = await this.client.send(new ListBranchesCommand({ repositoryName, nextToken }));
			for (const name of output.branches ?? []) {
				names.push(name);
			}
			nextToken = output.nextToken;
		} while (nextToken);
		return mapBranchNames(names);
	}

	async getBranch(repositoryName: string, branchName: string): Promise<BranchInfo> {
		const output = await this.client.send(new GetBranchCommand({ repositoryName, branchName }));
		if (!output.branch?.commitId) {
			throw new AppError(`CodeCommit did not return a tip commit for branch '${branchName}'.`, {
				kind: 'codecommit',
			});
		}
		return mapBranchInfo(output.branch);
	}

	async createBranch(repositoryName: string, branchName: string, commitId: string): Promise<void> {
		await this.client.send(new CreateBranchCommand({ repositoryName, branchName, commitId }));
	}

	async deleteBranch(repositoryName: string, branchName: string): Promise<void> {
		await this.client.send(new DeleteBranchCommand({ repositoryName, branchName }));
	}

	async setDefaultBranch(repositoryName: string, branchName: string): Promise<void> {
		await this.client.send(new UpdateDefaultBranchCommand({ repositoryName, defaultBranchName: branchName }));
	}

	async getFolder(
		repositoryName: string,
		commitSpecifier: string | undefined,
		folderPath: string
	): Promise<FolderContents> {
		const input: { repositoryName: string; folderPath: string; commitSpecifier?: string } = {
			repositoryName,
			folderPath,
		};
		if (commitSpecifier) {
			input.commitSpecifier = commitSpecifier;
		}
		const output = await this.client.send(new GetFolderCommand(input));
		return mapFolder(output);
	}

	async getFile(
		repositoryName: string,
		commitSpecifier: string | undefined,
		filePath: string
	): Promise<FileContent> {
		const input: { repositoryName: string; filePath: string; commitSpecifier?: string } = {
			repositoryName,
			filePath,
		};
		if (commitSpecifier) {
			input.commitSpecifier = commitSpecifier;
		}
		const output = await this.client.send(new GetFileCommand(input));
		return mapFile(output);
	}

	async getCommit(repositoryName: string, commitId: string): Promise<CommitInfo> {
		const output = await this.client.send(new GetCommitCommand({ repositoryName, commitId }));
		if (!output.commit) {
			throw new AppError(`CodeCommit did not return commit '${commitId}'.`, { kind: 'codecommit' });
		}
		return mapCommit(output.commit);
	}

	async listCommits(repositoryName: string, startCommitId: string, limit: number): Promise<CommitInfo[]> {
		const result: CommitInfo[] = [];
		const seen = new Set<string>();
		let cursor: string | undefined = startCommitId;
		while (cursor !== undefined && cursor !== '' && result.length < limit) {
			if (seen.has(cursor)) {
				break;
			}
			seen.add(cursor);
			const commit = await this.getCommit(repositoryName, cursor);
			result.push(commit);
			cursor = commit.parents.length > 0 ? commit.parents[0] : undefined;
		}
		return result;
	}

	async createCommit(options: CreateCommitOptions): Promise<CommitResult> {
		const input: CreateCommitInput = {
			repositoryName: options.repositoryName,
			branchName: options.branchName,
			parentCommitId: options.parentCommitId,
			commitMessage: options.commitMessage,
		};
		if (options.putFiles && options.putFiles.length > 0) {
			input.putFiles = options.putFiles.map((entry) => ({
				filePath: entry.filePath,
				fileContent: entry.fileContent,
				...(entry.fileMode ? { fileMode: entry.fileMode } : {}),
			}));
		}
		if (options.deleteFiles && options.deleteFiles.length > 0) {
			input.deleteFiles = options.deleteFiles.map((filePath) => ({ filePath }));
		}
		if (options.authorName) {
			input.authorName = options.authorName;
		}
		if (options.email) {
			input.email = options.email;
		}
		const output = await this.client.send(new CreateCommitCommand(input));
		if (!output.commitId) {
			throw new AppError('CodeCommit did not return a commit id for the created commit.', {
				kind: 'codecommit',
			});
		}
		return { commitId: output.commitId, treeId: output.treeId };
	}

	async putFile(options: {
		repositoryName: string;
		branchName: string;
		parentCommitId: string;
		filePath: string;
		fileContent: Uint8Array;
		commitMessage?: string;
		authorName?: string;
		email?: string;
	}): Promise<CommitResult> {
		const input: {
			repositoryName: string;
			branchName: string;
			parentCommitId: string;
			filePath: string;
			fileContent: Uint8Array;
			commitMessage?: string;
			authorName?: string;
			email?: string;
		} = {
			repositoryName: options.repositoryName,
			branchName: options.branchName,
			parentCommitId: options.parentCommitId,
			filePath: options.filePath,
			fileContent: options.fileContent,
		};
		if (options.commitMessage) {
			input.commitMessage = options.commitMessage;
		}
		if (options.authorName) {
			input.authorName = options.authorName;
		}
		if (options.email) {
			input.email = options.email;
		}
		const output = await this.client.send(new PutFileCommand(input));
		if (!output.commitId) {
			throw new AppError('CodeCommit did not return a commit id for the uploaded file.', {
				kind: 'codecommit',
			});
		}
		return { commitId: output.commitId, treeId: output.treeId };
	}

	async deleteFile(options: {
		repositoryName: string;
		branchName: string;
		parentCommitId: string;
		filePath: string;
		commitMessage?: string;
	}): Promise<CommitResult> {
		const input: {
			repositoryName: string;
			branchName: string;
			parentCommitId: string;
			filePath: string;
			commitMessage?: string;
		} = {
			repositoryName: options.repositoryName,
			branchName: options.branchName,
			parentCommitId: options.parentCommitId,
			filePath: options.filePath,
		};
		if (options.commitMessage) {
			input.commitMessage = options.commitMessage;
		}
		const output = await this.client.send(new DeleteFileCommand(input));
		if (!output.commitId) {
			throw new AppError('CodeCommit did not return a commit id for the deleted file.', {
				kind: 'codecommit',
			});
		}
		return { commitId: output.commitId, treeId: output.treeId };
	}

	async listPullRequests(repositoryName: string, status?: PullRequestStatus): Promise<PullRequestInfo[]> {
		const ids: string[] = [];
		let nextToken: string | undefined;
		do {
			const input: { repositoryName: string; nextToken?: string; pullRequestStatus?: PullRequestStatus } = {
				repositoryName,
				nextToken,
			};
			if (status) {
				input.pullRequestStatus = status;
			}
			const output = await this.client.send(new ListPullRequestsCommand(input));
			for (const id of output.pullRequestIds ?? []) {
				ids.push(id);
			}
			nextToken = output.nextToken;
		} while (nextToken);
		const uniqueIds = [...new Set(ids)];
		return Promise.all(uniqueIds.map((id) => this.getPullRequest(id)));
	}

	async getPullRequest(pullRequestId: string): Promise<PullRequestInfo> {
		const output = await this.client.send(new GetPullRequestCommand({ pullRequestId }));
		if (!output.pullRequest) {
			throw new AppError(`CodeCommit did not return pull request '${pullRequestId}'.`, {
				kind: 'codecommit',
			});
		}
		return mapPullRequest(output.pullRequest);
	}

	async createPullRequest(options: CreatePullRequestOptions): Promise<PullRequestInfo> {
		const input: {
			title: string;
			description?: string;
			targets: { repositoryName: string; sourceReference: string; destinationReference: string }[];
		} = {
			title: options.title,
			targets: [
				{
					repositoryName: options.repositoryName,
					sourceReference: toFullyQualifiedReference(options.sourceReference),
					destinationReference: toFullyQualifiedReference(options.destinationReference),
				},
			],
		};
		if (options.description) {
			input.description = options.description;
		}
		const output = await this.client.send(new CreatePullRequestCommand(input));
		if (!output.pullRequest) {
			throw new AppError('CodeCommit did not return the created pull request.', { kind: 'codecommit' });
		}
		return mapPullRequest(output.pullRequest);
	}

	async updatePullRequestTitle(pullRequestId: string, title: string): Promise<PullRequestInfo> {
		const output = await this.client.send(new UpdatePullRequestTitleCommand({ pullRequestId, title }));
		if (!output.pullRequest) {
			throw new AppError(`CodeCommit did not return pull request '${pullRequestId}'.`, {
				kind: 'codecommit',
			});
		}
		return mapPullRequest(output.pullRequest);
	}

	async updatePullRequestDescription(pullRequestId: string, description: string): Promise<PullRequestInfo> {
		const output = await this.client.send(
			new UpdatePullRequestDescriptionCommand({ pullRequestId, description })
		);
		if (!output.pullRequest) {
			throw new AppError(`CodeCommit did not return pull request '${pullRequestId}'.`, {
				kind: 'codecommit',
			});
		}
		return mapPullRequest(output.pullRequest);
	}

	async updatePullRequestStatus(pullRequestId: string, status: PullRequestStatus): Promise<PullRequestInfo> {
		const output = await this.client.send(
			new UpdatePullRequestStatusCommand({ pullRequestId, pullRequestStatus: status })
		);
		if (!output.pullRequest) {
			throw new AppError(`CodeCommit did not return pull request '${pullRequestId}'.`, {
				kind: 'codecommit',
			});
		}
		return mapPullRequest(output.pullRequest);
	}

	async postComment(options: PostCommentOptions): Promise<void> {
		if (!options.beforeCommitId || !options.afterCommitId) {
			throw new AppError(
				'This pull request does not expose the commit ids required to post a general comment. Open the pull request in the AWS console instead.',
				{ kind: 'codecommit' }
			);
		}
		await this.client.send(
			new PostCommentForPullRequestCommand({
				pullRequestId: options.pullRequestId,
				repositoryName: options.repositoryName,
				beforeCommitId: options.beforeCommitId,
				afterCommitId: options.afterCommitId,
				content: options.content,
				...(options.location ? { location: options.location } : {}),
			})
		);
	}

	async listComments(
		repositoryName: string,
		pullRequestId: string,
		beforeCommitId?: string,
		afterCommitId?: string
	): Promise<CommentInfo[]> {
		const input: {
			pullRequestId: string;
			repositoryName?: string;
			beforeCommitId?: string;
			afterCommitId?: string;
			nextToken?: string;
		} = { pullRequestId };
		if (repositoryName) {
			input.repositoryName = repositoryName;
		}
		if (beforeCommitId) {
			input.beforeCommitId = beforeCommitId;
		}
		if (afterCommitId) {
			input.afterCommitId = afterCommitId;
		}
		const groups: NonNullable<GetCommentsForPullRequestOutput['commentsForPullRequestData']> = [];
		let nextToken: string | undefined;
		do {
			input.nextToken = nextToken;
			const output = await this.client.send(new GetCommentsForPullRequestCommand(input));
			for (const group of output.commentsForPullRequestData ?? []) {
				groups.push(group);
			}
			nextToken = output.nextToken;
		} while (nextToken);
		return mapComments({ commentsForPullRequestData: groups });
	}
}

/** Creates the AWS-backed service from extension settings. */
export function createCodeCommitService(settings: AwsSettings): CodeCommitService {
	return new AwsCodeCommitService(createCodeCommitClient(settings), {
		region: settings.region,
		profile: settings.profile,
	});
}