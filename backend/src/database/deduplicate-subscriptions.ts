import mysql from 'mysql2/promise';
import { QueryRunner } from 'typeorm';

export interface DedupeRow {
	id: string;
	tags: string | null;
	customName: string | null;
	authStorageState: string | null;
}

export function mergeTags(
	tagStrings: (string | null | undefined)[],
): string | null {
	const allTags = new Set<string>();
	for (const str of tagStrings) {
		if (!str) continue;
		const parts = str
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean);
		for (const p of parts) {
			allTags.add(p);
		}
	}
	if (allTags.size === 0) return null;
	return Array.from(allTags).join(',');
}

/**
 * Deduplicates subscription rows by (userId, sourceId):
 * - Keeps the primary row (earliest by id)
 * - Merges tags from all duplicate rows without duplicates
 * - Preserves customName and authStorageState if the primary lacked them
 * - Deletes the duplicate rows
 * - Keeps article rows completely untouched
 */
export async function deduplicateSubscriptions(executor: {
	query: (sql: string, params?: any[]) => Promise<any>;
}): Promise<{ groupsDeduplicated: number; rowsDeleted: number }> {
	const duplicates: Array<{ userId: string; sourceId: string; cnt: number }> =
		await executor.query(`
      SELECT \`userId\`, \`sourceId\`, COUNT(*) as cnt
      FROM \`subscription\`
      WHERE \`userId\` IS NOT NULL AND \`sourceId\` IS NOT NULL
      GROUP BY \`userId\`, \`sourceId\`
      HAVING cnt > 1
    `);

	if (!duplicates || duplicates.length === 0) {
		return { groupsDeduplicated: 0, rowsDeleted: 0 };
	}

	let totalDeleted = 0;

	for (const dup of duplicates) {
		const rows: DedupeRow[] = await executor.query(
			`SELECT \`id\`, \`tags\`, \`customName\`, \`authStorageState\`
       FROM \`subscription\`
       WHERE \`userId\` = ? AND \`sourceId\` = ?
       ORDER BY \`id\` ASC`,
			[dup.userId, dup.sourceId],
		);

		if (rows.length <= 1) continue;

		const primary = rows[0];
		const duplicatesToDelete = rows.slice(1);

		const mergedTags = mergeTags(rows.map((r) => r.tags));
		const mergedCustomName =
			primary.customName ||
			duplicatesToDelete.find((r) => r.customName)?.customName ||
			null;
		const mergedAuthStorageState =
			primary.authStorageState ||
			duplicatesToDelete.find((r) => r.authStorageState)
				?.authStorageState ||
			null;

		await executor.query(
			`UPDATE \`subscription\`
       SET \`tags\` = ?, \`customName\` = ?, \`authStorageState\` = ?
       WHERE \`id\` = ?`,
			[mergedTags, mergedCustomName, mergedAuthStorageState, primary.id],
		);

		const deleteIds = duplicatesToDelete.map((r) => r.id);
		const placeholders = deleteIds.map(() => '?').join(',');
		await executor.query(
			`DELETE FROM \`subscription\` WHERE \`id\` IN (${placeholders})`,
			deleteIds,
		);

		totalDeleted += deleteIds.length;
	}

	return {
		groupsDeduplicated: duplicates.length,
		rowsDeleted: totalDeleted,
	};
}

/**
 * Pre-synchronize hook for development databases:
 * Runs before TypeORM synchronize runs its schema diff, preventing ER_DUP_ENTRY
 * crashes when @Unique(['user', 'source']) is synchronized.
 */
export async function deduplicateSubscriptionsPreSync(dbConfig: {
	host: string;
	port: number;
	user: string;
	password?: string;
	database: string;
}): Promise<void> {
	let connection: mysql.Connection | undefined;
	try {
		connection = await mysql.createConnection({
			host: dbConfig.host,
			port: dbConfig.port,
			user: dbConfig.user,
			password: dbConfig.password,
			database: dbConfig.database,
		});

		const [tableRows]: any = await connection.query(
			`SELECT COUNT(*) as count
       FROM information_schema.tables
       WHERE table_schema = ? AND table_name = 'subscription'`,
			[dbConfig.database],
		);

		if (tableRows && tableRows[0]?.count > 0) {
			await deduplicateSubscriptions({
				query: async (sql, params) => {
					const [res]: any = await connection!.query(sql, params);
					return res;
				},
			});
		}
	} catch {
		// If the DB doesn't exist yet or is unreachable, allow TypeORM to handle its own connection lifecycle
	} finally {
		if (connection) {
			await connection.end().catch(() => undefined);
		}
	}
}
