import {
  deduplicateSubscriptions,
  mergeTags,
} from './deduplicate-subscriptions';

describe('deduplicateSubscriptions', () => {
  describe('mergeTags', () => {
    it('merges overlapping and disjoint tags into a unique comma-separated string', () => {
      const result = mergeTags(['news,tech', 'tech,dev', 'finance']);
      expect(result).toBe('news,tech,dev,finance');
    });

    it('handles empty and null inputs gracefully', () => {
      expect(mergeTags([])).toBeNull();
      expect(mergeTags([null, undefined, ''])).toBeNull();
      expect(mergeTags([null, 'tech', ''])).toBe('tech');
    });
  });

  describe('deduplicateSubscriptions execution', () => {
    it('does nothing when there are no duplicates', async () => {
      const mockExecutor = {
        query: jest.fn().mockResolvedValue([]),
      };

      const result = await deduplicateSubscriptions(mockExecutor);

      expect(result).toEqual({ groupsDeduplicated: 0, rowsDeleted: 0 });
      expect(mockExecutor.query).toHaveBeenCalledTimes(1);
    });

    it('merges tags and deletes duplicate subscription rows', async () => {
      const duplicates = [{ userId: 'u1', sourceId: 's1', cnt: 2 }];
      const rows = [
        {
          id: 'sub-1',
          tags: 'news,tech',
          customName: 'Custom 1',
          authStorageState: null,
        },
        {
          id: 'sub-2',
          tags: 'tech,dev',
          customName: null,
          authStorageState: 'encrypted-state',
        },
      ];

      const queries: { sql: string; params?: any[] }[] = [];
      const mockExecutor = {
        query: jest
          .fn()
          .mockImplementation(async (sql: string, params?: any[]) => {
            queries.push({ sql, params });
            if (sql.includes('HAVING cnt > 1')) {
              return duplicates;
            }
            if (sql.includes('SELECT `id`')) {
              return rows;
            }
            return [];
          }),
      };

      const result = await deduplicateSubscriptions(mockExecutor);

      expect(result).toEqual({ groupsDeduplicated: 1, rowsDeleted: 1 });

      // Primary updated with merged tags and preserved authStorageState
      const updateQuery = queries.find((q) =>
        q.sql.includes('UPDATE `subscription`'),
      );
      expect(updateQuery).toBeDefined();
      expect(updateQuery?.params).toEqual([
        'news,tech,dev',
        'Custom 1',
        'encrypted-state',
        'sub-1',
      ]);

      // Duplicate deleted
      const deleteQuery = queries.find((q) =>
        q.sql.includes('DELETE FROM `subscription`'),
      );
      expect(deleteQuery).toBeDefined();
      expect(deleteQuery?.params).toEqual(['sub-2']);
    });
  });
});
