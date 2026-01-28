import { WorkStateMetadata } from '../../../src/domain/value-objects/work-state-metadata';
import { SchemaVersion } from '../../../src/domain/value-objects/schema-version';
import { TabInfo } from '../../../src/domain/value-objects/tab-info';

describe('WorkStateMetadata', () => {
  const mockTabs: TabInfo[] = [
    {
      url: 'https://example.com',
      title: 'Example Page',
      index: 0,
    },
  ];
  const version = SchemaVersion.create(1, 0, 0);
  const savedAt = new Date();

  describe('作成', () => {
    it('有効なメタデータで作成できる', () => {
      const metadata = WorkStateMetadata.create(version, mockTabs, savedAt);
      
      expect(metadata).toBeDefined();
      expect(metadata.version).toEqual(version);
      expect(metadata.tabs).toHaveLength(1);
      expect(metadata.savedAt).toBe(savedAt.toISOString());
    });

    it('メモ付きで作成できる', () => {
      const memo = '作業メモ';
      const metadata = WorkStateMetadata.create(version, mockTabs, savedAt, memo);
      
      expect(metadata.memo).toBe(memo);
    });

    it('拡張フィールド付きで作成できる', () => {
      const extensions = { tags: ['work', 'important'] };
      const metadata = WorkStateMetadata.create(version, mockTabs, savedAt, undefined, extensions);
      
      expect(metadata.extensions).toEqual(extensions);
    });

    it('空のタブ配列で作成しようとするとエラーを投げる', () => {
      expect(() => {
        WorkStateMetadata.create(version, [], savedAt);
      }).toThrow('WorkStateMetadata tabs must contain at least one tab');
    });

    it('無効な保存日時で作成しようとするとエラーを投げる', () => {
      expect(() => {
        WorkStateMetadata.createFromRaw(
          {
            version: '1.0.0',
            tabs: mockTabs,
            savedAt: 'invalid-date',
          },
          version
        );
      }).toThrow('WorkStateMetadata savedAt must be a valid ISO 8601 date string');
    });
  });

  describe('createFromRaw', () => {
    it('生データからメタデータを作成できる', () => {
      const raw = {
        version: '1.0.0',
        tabs: mockTabs,
        savedAt: savedAt.toISOString(),
        memo: '作業メモ',
      };
      
      const metadata = WorkStateMetadata.createFromRaw(raw, version);
      
      expect(metadata).toBeDefined();
      expect(metadata.memo).toBe('作業メモ');
    });

    it('未知のフィールドをextensionsに格納できる', () => {
      const raw = {
        version: '1.0.0',
        tabs: mockTabs,
        savedAt: savedAt.toISOString(),
        unknownField: 'unknown-value',
      };
      
      const metadata = WorkStateMetadata.createFromRaw(raw, version);
      
      expect(metadata.extensions).toBeDefined();
      expect(metadata.extensions?.unknownField).toBe('unknown-value');
    });
  });

  describe('等価性', () => {
    it('同じ値のメタデータは等しい', () => {
      const metadata1 = WorkStateMetadata.create(version, mockTabs, savedAt);
      const metadata2 = WorkStateMetadata.create(version, mockTabs, savedAt);
      
      expect(metadata1.equals(metadata2)).toBe(true);
    });

    it('異なる値のメタデータは等しくない', () => {
      const metadata1 = WorkStateMetadata.create(version, mockTabs, savedAt);
      const metadata2 = WorkStateMetadata.create(version, mockTabs, new Date());
      
      expect(metadata1.equals(metadata2)).toBe(false);
    });
  });
});
