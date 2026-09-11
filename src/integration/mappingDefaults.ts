/**
 * Pure helper implementing the "keep or change" prompt pattern: the first
 * quick-pick option adopts a mapped default, the remaining options are the
 * alternatives, so the default is preselected conceptually yet changeable.
 */
export interface KeepOrChangeItem<T> {
	label: string;
	description?: string;
	value: T;
}

/** Builds quick-pick items with the mapped default first, marked as default. */
export function buildKeepOrChangeItems<T>(
	preferred: T,
	others: readonly T[],
	format: (value: T) => string,
	preferredLabel = 'workspace mapping'
): KeepOrChangeItem<T>[] {
	const items: KeepOrChangeItem<T>[] = [
		{ label: `$(check) ${format(preferred)}`, description: `default from ${preferredLabel}`, value: preferred },
	];
	for (const other of others) {
		if (other === preferred) {
			continue;
		}
		items.push({ label: format(other), value: other });
	}
	return items;
}
