/**
 * Service abstraction for all CodeCommit operations used by the tree and
 * command handlers. Implemented by the AWS SDK adapter and mockable in tests.
 */
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

/** All repository, branch, file, commit, and pull request operations. */
export interface CodeCommitService {
	readonly region?: string;
	readonly profile?: string;

	// Repositories
	listRepositories(): Promise<RepositoryInfo[]>;
	getRepository(repositoryName: string): Promise<RepositoryDetails>;

	// Branches
	listBranches(repositoryName: string): Promise<BranchInfo[]>;
	getBranch(repositoryName: string, branchName: string): Promise<BranchInfo>;
	createBranch(repositoryName: string, branchName: string, commitId: string): Promise<void>;
	deleteBranch(repositoryName: string, branchName: string): Promise<void>;
	setDefaultBranch(repositoryName: string, branchName: string): Promise<void>;

	// Files and folders
	getFolder(repositoryName: string, commitSpecifier: string | undefined, folderPath: string): Promise<FolderContents>;
	getFile(repositoryName: string, commitSpecifier: string | undefined, filePath: string): Promise<FileContent>;

	// Commits
	getCommit(repositoryName: string, commitId: string): Promise<CommitInfo>;
	listCommits(repositoryName: string, startCommitId: string, limit: number): Promise<CommitInfo[]>;
	createCommit(options: CreateCommitOptions): Promise<CommitResult>;
	putFile(options: {
		repositoryName: string;
		branchName: string;
		parentCommitId: string;
		filePath: string;
		fileContent: Uint8Array;
		commitMessage?: string;
		authorName?: string;
		email?: string;
	}): Promise<CommitResult>;
	deleteFile(options: {
		repositoryName: string;
		branchName: string;
		parentCommitId: string;
		filePath: string;
		commitMessage?: string;
	}): Promise<CommitResult>;

	// Pull requests and comments
	listPullRequests(repositoryName: string, status?: PullRequestStatus): Promise<PullRequestInfo[]>;
	getPullRequest(pullRequestId: string): Promise<PullRequestInfo>;
	createPullRequest(options: CreatePullRequestOptions): Promise<PullRequestInfo>;
	updatePullRequestTitle(pullRequestId: string, title: string): Promise<PullRequestInfo>;
	updatePullRequestDescription(pullRequestId: string, description: string): Promise<PullRequestInfo>;
	updatePullRequestStatus(pullRequestId: string, status: PullRequestStatus): Promise<PullRequestInfo>;
	postComment(options: PostCommentOptions): Promise<void>;
	listComments(
		repositoryName: string,
		pullRequestId: string,
		beforeCommitId?: string,
		afterCommitId?: string
	): Promise<CommentInfo[]>;
}