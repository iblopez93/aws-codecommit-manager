/**
 * Pure mapping functions between AWS SDK types and the extension domain types.
 * No VS Code or network imports here so these are unit testable.
 */
import {
	BranchInfo as SdkBranchInfo,
	Comment as SdkComment,
	CommentsForPullRequest as SdkCommentsForPullRequest,
	Commit as SdkCommit,
	Difference as SdkDifference,
	File as SdkFile,
	GetFileOutput,
	GetFolderOutput,
	PullRequest as SdkPullRequest,
	SymbolicLink,
} from '@aws-sdk/client-codecommit';

import {
	BranchInfo,
	ChangeTypeEnum,
	CommentInfo,
	CommitInfo,
	DifferenceInfo,
	FileContent,
	FileEntry,
	FolderContents,
	PullRequestInfo,
	RepositoryDetails,
	RepositoryInfo,
	SymbolicLinkEntry,
	SubModuleEntry,
} from './types';

/** Normalizes a CodeCommit absolute path to rootless forward-slash form. */
export function normalizePath(p: string): string {
	return (p ?? '').replace(/\\/g, '/').replace(/^\/+/, '');
}

/** Maps a repository name/id pair from ListRepositories. */
export function mapRepositoryNameIdPair(pair: { repositoryName?: string; repositoryId?: string }): RepositoryInfo {
	return {
		name: pair.repositoryName ?? '',
		id: pair.repositoryId,
	};
}

/** Maps repository metadata from GetRepository/BatchGetRepositories. */
export function mapRepositoryMetadata(metadata: {
	accountId?: string;
	repositoryId?: string;
	repositoryName?: string;
	repositoryDescription?: string;
	defaultBranch?: string;
	lastModifiedDate?: Date;
	creationDate?: Date;
	cloneUrlHttp?: string;
	cloneUrlSsh?: string;
	Arn?: string;
}): RepositoryDetails {
	return {
		name: metadata.repositoryName ?? '',
		id: metadata.repositoryId,
		accountId: metadata.accountId,
		description: metadata.repositoryDescription,
		defaultBranch: metadata.defaultBranch,
		cloneUrlHttp: metadata.cloneUrlHttp,
		cloneUrlSsh: metadata.cloneUrlSsh,
		arn: metadata.Arn,
		creationDate: metadata.creationDate,
		lastModifiedDate: metadata.lastModifiedDate,
	};
}

/** Maps a list of branch names into domain branch infos (tips unknown). */
export function mapBranchNames(names: string[]): BranchInfo[] {
	return names.map((name) => ({ name }));
}

/** Maps GetBranch output into a domain branch info. */
export function mapBranchInfo(branch: SdkBranchInfo): BranchInfo {
	return {
		name: branch.branchName ?? '',
		commitId: branch.commitId,
	};
}

/** Maps a GetFolder output into domain folder contents. */
export function mapFolder(output: GetFolderOutput): FolderContents {
	return {
		commitId: output.commitId ?? '',
		path: normalizePath(output.folderPath ?? ''),
		treeId: output.treeId,
		subFolders: (output.subFolders ?? []).map((folder) => ({
			path: normalizePath(folder.absolutePath ?? folder.relativePath ?? ''),
			treeId: folder.treeId,
		})),
		files: (output.files ?? []).map((file) => mapFileEntry(file)),
		symbolicLinks: (output.symbolicLinks ?? []).map((link) => mapSymbolicLink(link)),
		subModules: (output.subModules ?? []).map((subModule) => ({
			path: normalizePath(subModule.absolutePath ?? subModule.relativePath ?? ''),
			commitId: subModule.commitId,
		})),
	};
}

/** Maps a CodeCommit File entry into a domain file entry. */
export function mapFileEntry(file: SdkFile): FileEntry {
	return {
		path: normalizePath(file.absolutePath ?? file.relativePath ?? ''),
		blobId: file.blobId,
		mode: file.fileMode,
	};
}

/** Maps a CodeCommit symbolic link into a domain file entry. */
export function mapSymbolicLink(link: SymbolicLink): SymbolicLinkEntry {
	return {
		path: normalizePath(link.absolutePath ?? link.relativePath ?? ''),
		blobId: link.blobId,
		mode: link.fileMode,
	};
}

/** Maps GetFile output into domain file content. */
export function mapFile(output: GetFileOutput): FileContent {
	return {
		path: normalizePath(output.filePath ?? ''),
		commitId: output.commitId ?? '',
		blobId: output.blobId,
		content: output.fileContent ?? new Uint8Array(),
		size: output.fileSize ?? 0,
		mode: output.fileMode,
	};
}

/** Maps a CodeCommit Commit into a domain commit info. */
export function mapCommit(commit: SdkCommit): CommitInfo {
	return {
		commitId: commit.commitId ?? '',
		treeId: commit.treeId,
		parents: commit.parents ?? [],
		message: commit.message ?? '',
		authorName: commit.author?.name,
		authorEmail: commit.author?.email,
		authorDate: commit.author?.date,
		committerName: commit.committer?.name,
		committerDate: commit.committer?.date,
	};
}

/** Maps a CodeCommit PullRequest into a domain pull request info. */
export function mapPullRequest(pullRequest: SdkPullRequest): PullRequestInfo {
	const target = pullRequest.pullRequestTargets?.[0];
	return {
		pullRequestId: pullRequest.pullRequestId ?? '',
		title: pullRequest.title ?? '',
		description: pullRequest.description,
		status: pullRequest.pullRequestStatus === 'CLOSED' ? 'CLOSED' : 'OPEN',
		authorArn: pullRequest.authorArn,
		creationDate: pullRequest.creationDate,
		lastActivityDate: pullRequest.lastActivityDate,
		revisionId: pullRequest.revisionId,
		repositoryName: target?.repositoryName,
		sourceReference: target?.sourceReference,
		sourceCommit: target?.sourceCommit,
		destinationReference: target?.destinationReference,
		destinationCommit: target?.destinationCommit,
	};
}

/** Maps a CodeCommit Comment + location into a domain comment info. */
export function mapComment(
	comment: SdkComment,
	location?: SdkCommentsForPullRequest['location']
): CommentInfo {
	return {
		commentId: comment.commentId ?? '',
		content: comment.content,
		authorArn: comment.authorArn,
		creationDate: comment.creationDate,
		inReplyTo: comment.inReplyTo,
		location: location
			? {
					filePath: location.filePath,
					filePosition: location.filePosition,
					relativeFileVersion: location.relativeFileVersion,
				}
			: undefined,
	};
}

/** Maps GetCommentsForPullRequest output into domain comments. */
export function mapComments(output: { commentsForPullRequestData?: SdkCommentsForPullRequest[] }): CommentInfo[] {
	const groups = output.commentsForPullRequestData ?? [];
	const result: CommentInfo[] = [];
	for (const group of groups) {
		const location = group.location;
		for (const comment of group.comments ?? []) {
			result.push(mapComment(comment, location));
		}
	}
	return result;
}

/**
 * Maps a GetDifferences entry into a domain difference. Paths are normalized to
 * rootless form; unknown change types map to 'M' (the least destructive view).
 */
export function mapDifference(difference: SdkDifference): DifferenceInfo {
	const beforeBlobId = difference.beforeBlob?.blobId;
	const afterBlobId = difference.afterBlob?.blobId;
	const beforePath = normalizePath(difference.beforeBlob?.path ?? '');
	const afterPath = normalizePath(difference.afterBlob?.path ?? '');
	const path = afterPath || beforePath;
	const changeType: ChangeTypeEnum =
		difference.changeType === 'A' || difference.changeType === 'D' ? difference.changeType : 'M';
	return {
		path,
		changeType,
		beforeBlobId,
		afterBlobId,
	};
}

/** Maps GetDifferences output pages into domain differences. */
export function mapDifferences(output: { differences?: SdkDifference[] }): DifferenceInfo[] {
	return (output.differences ?? []).map(mapDifference);
}

/**
 * Groups review comments by their file location so the comments section and
 * details panel render one thread per file/line. Comments without a location
 * share a single "general" group. Pure and unit testable.
 */
export function groupComments(
	comments: CommentInfo[]
): { key: string; filePath?: string; filePosition?: number; comments: CommentInfo[] }[] {
	const groups = new Map<string, { key: string; filePath?: string; filePosition?: number; comments: CommentInfo[] }>();
	for (const comment of comments) {
		const filePath = comment.location?.filePath;
		const filePosition = comment.location?.filePosition;
		const key = filePath ? `${filePath}:${filePosition ?? 1}` : 'general';
		const group = groups.get(key) ?? { key, filePath, filePosition, comments: [] };
		group.comments.push(comment);
		groups.set(key, group);
	}
	return [...groups.values()];
}

/** Truncates a commit id for display. */
export function shortId(id: string, length = 8): string {
	return id.length > length ? id.substring(0, length) : id;
}

/** Compacts a long author ARN into a readable user-like suffix. */
export function compactArn(arn: string | undefined): string {
	if (!arn) {
		return '';
	}
	return arn.includes('/') ? arn.substring(arn.lastIndexOf('/') + 1) : arn;
}