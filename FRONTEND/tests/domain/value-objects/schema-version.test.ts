import { SchemaVersion } from '../../../src/domain/value-objects/schema-version';

describe('SchemaVersion', () => {
  describe('作成', () => {
    it('有効なバージョンで作成できる', () => {
      const version = SchemaVersion.create(1, 0, 0);
      
      expect(version).toBeDefined();
      expect(version.major).toBe(1);
      expect(version.minor).toBe(0);
      expect(version.patch).toBe(0);
    });

    it('負の値で作成しようとするとエラーを投げる', () => {
      expect(() => {
        SchemaVersion.create(-1, 0, 0);
      }).toThrow('SchemaVersion major must be a non-negative integer');
    });

    it('整数でない値で作成しようとするとエラーを投げる', () => {
      expect(() => {
        SchemaVersion.create(1.5, 0, 0);
      }).toThrow('SchemaVersion major must be a non-negative integer');
    });
  });

  describe('parse', () => {
    it('有効なバージョン文字列から作成できる', () => {
      const version = SchemaVersion.parse('1.0.0');
      
      expect(version).toBeDefined();
      expect(version.major).toBe(1);
      expect(version.minor).toBe(0);
      expect(version.patch).toBe(0);
    });

    it('無効な形式のバージョン文字列で作成しようとするとエラーを投げる', () => {
      expect(() => {
        SchemaVersion.parse('1.0');
      }).toThrow('SchemaVersion string must be in format "major.minor.patch"');
    });

    it('空文字列で作成しようとするとエラーを投げる', () => {
      expect(() => {
        SchemaVersion.parse('');
      }).toThrow('SchemaVersion string cannot be empty');
    });
  });

  describe('toString', () => {
    it('バージョン文字列に変換できる', () => {
      const version = SchemaVersion.create(1, 2, 3);
      
      expect(version.toString()).toBe('1.2.3');
    });
  });

  describe('isCompatibleWith', () => {
    it('同じメジャーバージョンは互換性がある', () => {
      const version1 = SchemaVersion.create(1, 0, 0);
      const version2 = SchemaVersion.create(1, 1, 0);
      
      expect(version1.isCompatibleWith(version2)).toBe(true);
    });

    it('異なるメジャーバージョンは互換性がない', () => {
      const version1 = SchemaVersion.create(1, 0, 0);
      const version2 = SchemaVersion.create(2, 0, 0);
      
      expect(version1.isCompatibleWith(version2)).toBe(false);
    });
  });

  describe('canMigrateTo', () => {
    it('同じメジャーバージョンにマイグレーション可能', () => {
      const fromVersion = SchemaVersion.create(1, 0, 0);
      const toVersion = SchemaVersion.create(1, 1, 0);
      
      expect(fromVersion.canMigrateTo(toVersion)).toBe(true);
    });

    it('新しいメジャーバージョンにマイグレーション可能', () => {
      const fromVersion = SchemaVersion.create(1, 0, 0);
      const toVersion = SchemaVersion.create(2, 0, 0);
      
      expect(fromVersion.canMigrateTo(toVersion)).toBe(true);
    });
  });

  describe('equals', () => {
    it('同じバージョンは等しい', () => {
      const version1 = SchemaVersion.create(1, 0, 0);
      const version2 = SchemaVersion.create(1, 0, 0);
      
      expect(version1.equals(version2)).toBe(true);
    });

    it('異なるバージョンは等しくない', () => {
      const version1 = SchemaVersion.create(1, 0, 0);
      const version2 = SchemaVersion.create(1, 1, 0);
      
      expect(version1.equals(version2)).toBe(false);
    });
  });
});
