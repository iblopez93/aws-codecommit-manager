/**
 * Pure parser for CodeCommit git remote URLs. Handles the HTTPS and the
 * "GRC" (git-remote-codecommit) forms; anything else is not a CodeCommit
 * remote and yields undefined so callers can skip it silently.
 */
export interface CodeCommitRemoteRef {
	region: string;
	repositoryName: string;
}

/** Matches `https://git-codecommit.<region>.amazonaws.com/v1/repos/<repo>`. */
const HTTPS_PATTERN = /^https:\/\/git-codecommit\.([a-z0-9-]+)\.amazonaws\.com\/v1\/repos\/([^/?#]+)/i;

/** Matches the GRC shorthand `codecommit::<region>:<repo>` (region optional). */
const GRC_PATTERN = /^codecommit::(?:([a-z0-9-]+):)?([^/?#]+)$/i;

/**
 * Parses a remote URL into its region and repository name. Returns undefined
 * when the URL is not a recognized CodeCommit remote.
 */
export function parseCodeCommitRemoteUrl(url: string): CodeCommitRemoteRef | undefined {
	const value = (url ?? '').trim();
	if (value.length === 0) {
		return undefined;
	}
	const https = HTTPS_PATTERN.exec(value);
	if (https) {
		return { region: https[1], repositoryName: decodeURIComponent(https[2]) };
	}
	const grc = GRC_PATTERN.exec(value);
	if (grc) {
		return { region: grc[1] ?? '', repositoryName: decodeURIComponent(grc[2]) };
	}
	return undefined;
}

/** True when the remote URL points at CodeCommit. */
export function isCodeCommitRemoteUrl(url: string): boolean {
	return parseCodeCommitRemoteUrl(url) !== undefined;
}
