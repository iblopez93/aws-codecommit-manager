/**
 * Domain types shared across the extension. These are independent of the AWS SDK
 * and the VS Code APIs so that pure logic can be unit tested without AWS access.
 */

/** A CodeCommit repository identifier. */
export interface RepositoryInfo {
	name: string;
	id?: string;
}

/** Extended repository metadata returned by CodeCommit. */
export interface RepositoryDetails {
	name: string;
	id?: string;
	accountId?: string;
	description?: string;
	defaultBranch?: string;
	cloneUrlHttp?: string;
	cloneUrlSsh?: string;
	arn?: string;
	creationDate?: Date;
	lastModifiedDate?: Date;
}

/** A branch reference with its tip commit id when known. */
export interface BranchInfo {
	name: string;
	commitId?: string;
}

/** A folder entry inside a repository tree. */
export interface FolderEntry {
	path: string;
	treeId?: string;
}

/** A file entry inside a repository tree. */
export interface FileEntry {
	path: string;
	blobId?: string;
	size?: number;
	mode?: string;
}

/** A symbolic link entry inside a repository tree. */
export interface SymbolicLinkEntry {
	path: string;
	blobId?: string;
	mode?: string;
}

/** A submodule entry inside a repository tree. */
export interface SubModuleEntry {
	path: string;
	commitId?: string;
}

/** The contents of a folder at a specific commit. */
export interface FolderContents {
	commitId: string;
	path: string;
	treeId?: string;
	subFolders: FolderEntry[];
	files: FileEntry[];
	symbolicLinks: SymbolicLinkEntry[];
	subModules: SubModuleEntry[];
}

/** The decoded content of a single remote file. */
export interface FileContent {
	path: string;
	commitId: string;
	blobId?: string;
	content: Uint8Array;
	size: number;
	mode?: string;
}

/** Commit summary information used by the tree and commit list. */
export interface CommitInfo {
	commitId: string;
	treeId?: string;
	parents: string[];
	message: string;
	authorName?: string;
	authorEmail?: string;
	authorDate?: string;
	committerName?: string;
	committerDate?: string;
}

/** Pull request lifecycle states supported by CodeCommit. */
export type PullRequestStatus = 'OPEN' | 'CLOSED';

/** Pull request summary used by the tree and command handlers. */
export interface PullRequestInfo {
	pullRequestId: string;
	title: string;
	description?: string;
	status: PullRequestStatus;
	authorArn?: string;
	creationDate?: Date;
	lastActivityDate?: Date;
	revisionId?: string;
	repositoryName?: string;
	sourceReference?: string;
	sourceCommit?: string;
	destinationReference?: string;
	destinationCommit?: string;
}

/** Location of a code comment within a pull request comparison. */
export interface CommentLocation {
	filePath?: string;
	filePosition?: number;
	relativeFileVersion?: 'BEFORE' | 'AFTER';
}

/** A review comment on a pull request. */
export interface CommentInfo {
	commentId: string;
	content?: string;
	authorArn?: string;
	creationDate?: Date;
	inReplyTo?: string;
	location?: CommentLocation;
}

/** File mode values accepted by CodeCommit. */
export type FileMode = 'NORMAL' | 'EXECUTABLE';

/** A file to add or update as part of a commit. */
export interface PutFileEntry {
	filePath: string;
	fileContent: Uint8Array;
	fileMode?: FileMode;
}

/** Options for creating a single atomic commit on a branch. */
export interface CreateCommitOptions {
	repositoryName: string;
	branchName: string;
	parentCommitId: string;
	commitMessage: string;
	authorName?: string;
	email?: string;
	putFiles?: PutFileEntry[];
	deleteFiles?: string[];
}

/** The result of a successful commit creation. */
export interface CommitResult {
	commitId: string;
	treeId?: string;
}

/** Options for creating a pull request. */
export interface CreatePullRequestOptions {
	repositoryName: string;
	title: string;
	description?: string;
	sourceReference: string;
	destinationReference: string;
}

/** Options for posting a comment on a pull request. */
export interface PostCommentOptions {
	repositoryName: string;
	pullRequestId: string;
	beforeCommitId?: string;
	afterCommitId?: string;
	content: string;
	location?: CommentLocation;
}