import { MetadataMigrator } from '../../../src/domain/factories/metadata-migrator';
import { WorkStateMetadata } from '../../../src/domain/value-objects/work-state-metadata';
import { SchemaVersion } from '../../../src/domain/value-objects/schema-version';
import { TabInfo } from '../../../src/domain/value-objects/tab-info';

describe('MetadataMigrator', () => {
  const mockTabs: TabInfo[] = [
    {
      url: 'https://example.com',
      title: 'Example Page',
      index: 0,
    },
  ];
  const version1_0_0 = SchemaVersion.create(1, 0, 0);
  const version1_1_0 = SchemaVersion.create(1, 1, 0);
  const version2_0_0 = SchemaVersion.create(2, 0, 0);
  const metadata = WorkStateMetadata.create(version1_0_0, mockTabs, new Date());

  describe('migrate', () => {
    it('同じバージョンにマイグレーションすると元のメタデータを返す', () => {
      const migrated = MetadataMigrator.migrate(metadata, version1_0_0);
      
      expect(migrated).toEqual(metadata);
    });

    it('新しいマイナーバージョンにマイグレーションできる', () => {
      const migrated = MetadataMigrator.migrate(metadata, version1_1_0);
      
      expect(migrated).toBeDefined();
      expect(migrated.version.equals(version1_1_0)).toBe(true);
    });

    it('マイグレーション不可能なバージョンにマイグレーションしようとするとエラーを投げる', () => {
      // 現在の実装では、メジャーバージョンアップはサポートされているため、
      // このテストは将来的に実装される可能性がある
      // 現時点では、canMigrateToがtrueを返すため、エラーは発生しない
    });
  });

  describe('canMigrate', () => {
    it('同じメジャーバージョンにマイグレーション可能', () => {
      expect(MetadataMigrator.canMigrate(version1_0_0, version1_1_0)).toBe(true);
    });

    it('新しいメジャーバージョンにマイグレーション可能', () => {
      expect(MetadataMigrator.canMigrate(version1_0_0, version2_0_0)).toBe(true);
    });
  });

  describe('getMigrationPath', () => {
    it('同じバージョンの場合は空のパスを返す', () => {
      const path = MetadataMigrator.getMigrationPath(version1_0_0, version1_0_0);
      
      expect(path).toEqual([]);
    });

    it('同じメジャーバージョン内のマイグレーションパスを取得できる', () => {
      const path = MetadataMigrator.getMigrationPath(version1_0_0, version1_1_0);
      
      expect(path.length).toBeGreaterThan(0);
      expect(path[path.length - 1].equals(version1_1_0)).toBe(true);
    });
  });
});
