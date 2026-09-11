/**
 * Output channel wrapper for diagnostics. Every line written through this
 * module is redacted first so credentials, tokens, and keys never reach logs.
 */
import * as vscode from 'vscode';

let channel: vscode.OutputChannel | undefined;

/** Secret patterns replaced with redaction markers before any log write. */
const SECRET_PATTERNS: [RegExp, string][] = [
	[/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[REDACTED KEY]'],
	[/(aws_access_key_id\s*=\s*)\S+/gi, '$1[REDACTED]'],
	[/(aws_secret_access_key\s*=\s*)\S+/gi, '$1[REDACTED]'],
	[/\b(AKIA[0-9A-Z]{16})\b/g, '[REDACTED ACCESS KEY]'],
	[/(secret|token|password|session|authorization)\s*[=:]\s*("[^"]*"|'[^']*'|[^,;\s}]+)/gi, '$1=[REDACTED]'],
];

/** Redacts credentials, tokens, and keys from a log payload. */
export function redact(value: string): string {
	let result = value ?? '';
	for (const [pattern, replacement] of SECRET_PATTERNS) {
		result = result.replace(pattern, replacement);
	}
	return result;
}

/** Registers the shared "AWS CodeCommit" output channel. */
export function initLog(context: vscode.ExtensionContext): void {
	channel = vscode.window.createOutputChannel('AWS CodeCommit');
	context.subscriptions.push(channel);
}

/** The registered channel, or undefined before activation. */
export function getLogChannel(): vscode.OutputChannel | undefined {
	return channel;
}

/** Severity label used as the log line prefix. */
export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

/** Formats a log line with timestamp, level, operation, and duration. */
export function formatLogLine(
	level: LogLevel,
	operation: string,
	detail: string,
	durationMs?: number
): string {
	const time = new Date().toISOString();
	const duration = durationMs !== undefined ? ` (${durationMs}ms)` : '';
	return `[${time}] [${level}] ${operation}${duration}: ${detail}`;
}

/** Writes one redacted line to the channel. */
export function log(level: LogLevel, operation: string, detail: string, durationMs?: number): void {
	if (!channel) {
		return;
	}
	channel.appendLine(redact(formatLogLine(level, operation, detail, durationMs)));
}

/** Logs an operation outcome with duration, normalizing errors safely. */
export function logOutcome(operation: string, error?: unknown, durationMs?: number): void {
	if (error === undefined) {
		log('INFO', operation, 'succeeded', durationMs);
		return;
	}
	const message = error instanceof Error ? error.message : String(error);
	log('ERROR', operation, message, durationMs);
}

/** Shows the output channel without stealing focus from the editor. */
export function showLogsCommand(): void {
	if (channel) {
		channel.show(true);
	} else {
		void vscode.window.showInformationMessage('Diagnostics are not initialized yet.');
	}
}
