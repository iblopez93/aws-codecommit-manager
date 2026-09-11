/**
 * Tree node element types for the AWS CodeCommit view. Each node is a plain
 * discriminated union so the provider can build stable ids and context values.
 */
import {
	BranchInfo,
	CommentInfo,
	CommitInfo,
	DifferenceInfo,
	FileEntry,
	PullRequestInfo,
	RepositoryInfo,
} from '../domain/types';

export interface RootNode {
	kind: 'root';
}

export interface RepositoryNode {
	kind: 'repository';
	repository: RepositoryInfo;
}

export interface BranchesGroupNode {
	kind: 'branchesGroup';
	repositoryName: string;
}

export interface BranchNode {
	kind: 'branch';
	repositoryName: string;
	branch: BranchInfo;
}

export interface FilesGroupNode {
	kind: 'filesGroup';
	repositoryName: string;
	branchName: string;
}

export interface FolderNode {
	kind: 'folder';
	repositoryName: string;
	branchName: string;
	path: string;
}

export interface FileNode {
	kind: 'file';
	repositoryName: string;
	branchName: string;
	entry: FileEntry;
}

export interface CommitsGroupNode {
	kind: 'commitsGroup';
	repositoryName: string;
	branchName: string;
}

export interface CommitNode {
	kind: 'commit';
	repositoryName: string;
	branchName: string;
	commit: CommitInfo;
}

export interface LoadMoreCommitsNode {
	kind: 'loadMoreCommits';
	repositoryName: string;
	branchName: string;
}

export interface PullRequestsGroupNode {
	kind: 'pullRequestsGroup';
	repositoryName: string;
}

export interface PullRequestNode {
	kind: 'pullRequest';
	repositoryName: string;
	pullRequest: PullRequestInfo;
}

export interface CommentsGroupNode {
	kind: 'commentsGroup';
	repositoryName: string;
	pullRequest: PullRequestInfo;
}

export interface CommentNode {
	kind: 'comment';
	repositoryName: string;
	pullRequest: PullRequestInfo;
	comment: CommentInfo;
}

export interface ChangedFilesGroupNode {
	kind: 'changedFilesGroup';
	repositoryName: string;
	pullRequest: PullRequestInfo;
}

export interface ChangedFileNode {
	kind: 'changedFile';
	repositoryName: string;
	pullRequest: PullRequestInfo;
	difference: DifferenceInfo;
}

export interface ErrorNode {
	kind: 'error';
	message: string;
}

/** Every element the tree provider can render. */
export type TreeNode =
	| RootNode
	| RepositoryNode
	| BranchesGroupNode
	| BranchNode
	| FilesGroupNode
	| FolderNode
	| FileNode
	| CommitsGroupNode
	| CommitNode
	| LoadMoreCommitsNode
	| PullRequestsGroupNode
	| PullRequestNode
	| ChangedFilesGroupNode
	| ChangedFileNode
	| CommentsGroupNode
	| CommentNode
	| ErrorNode;

/** Maps a node to its `viewItem` context value used by context menus. */
export function contextValueOf(node: TreeNode): string {
	switch (node.kind) {
		case 'root':
			return 'root';
		case 'repository':
			return 'repository';
		case 'branchesGroup':
			return 'branchesGroup';
		case 'branch':
			return 'branch';
		case 'filesGroup':
			return 'filesGroup';
		case 'folder':
			return 'folder';
		case 'file':
			return 'file';
		case 'commitsGroup':
			return 'commitsGroup';
		case 'commit':
			return 'commit';
		case 'loadMoreCommits':
			return 'loadMoreCommits';
		case 'pullRequestsGroup':
			return 'pullRequestsGroup';
		case 'pullRequest':
			return 'pullRequest';
		case 'changedFilesGroup':
			return 'changedFilesGroup';
		case 'changedFile':
			return 'changedFile';
		case 'commentsGroup':
			return 'commentsGroup';
		case 'comment':
			return 'comment';
		case 'error':
			return 'errorNode';
	}
}

/** Stable per-node id so selection and expansion survive refreshes. */
export function nodeId(node: TreeNode): string {
	switch (node.kind) {
		case 'root':
			return 'root';
		case 'repository':
			return `repository:${node.repository.name}`;
		case 'branchesGroup':
			return `branchesGroup:${node.repositoryName}`;
		case 'branch':
			return `branch:${node.repositoryName}/${node.branch.name}`;
		case 'filesGroup':
			return `filesGroup:${node.repositoryName}/${node.branchName}`;
		case 'folder':
			return `folder:${node.repositoryName}/${node.branchName}/${node.path}`;
		case 'file':
			return `file:${node.repositoryName}/${node.branchName}/${node.entry.path}`;
		case 'commitsGroup':
			return `commitsGroup:${node.repositoryName}/${node.branchName}`;
		case 'commit':
			return `commit:${node.repositoryName}/${node.branchName}/${node.commit.commitId}`;
		case 'loadMoreCommits':
			return `loadMoreCommits:${node.repositoryName}/${node.branchName}`;
		case 'pullRequestsGroup':
			return `pullRequestsGroup:${node.repositoryName}`;
		case 'pullRequest':
			return `pullRequest:${node.pullRequest.pullRequestId}`;
		case 'changedFilesGroup':
			return `changedFilesGroup:${node.pullRequest.pullRequestId}`;
		case 'changedFile':
			return `changedFile:${node.pullRequest.pullRequestId}/${node.difference.path}`;
		case 'commentsGroup':
			return `commentsGroup:${node.pullRequest.pullRequestId}`;
		case 'comment':
			return `comment:${node.comment.commentId}`;
		case 'error':
			return `error:${node.message}`;
	}
}