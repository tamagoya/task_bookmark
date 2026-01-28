import { EventDescription } from '../../../src/domain/value-objects/event-description';
import { WorkStateMetadata } from '../../../src/domain/value-objects/work-state-metadata';
import { SchemaVersion } from '../../../src/domain/value-objects/schema-version';
import { TabInfo } from '../../../src/domain/value-objects/tab-info';

describe('EventDescription', () => {
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
    it('メタデータからEventDescriptionを作成できる', () => {
      const metadata = WorkStateMetadata.create(version, mockTabs, savedAt);
      const description = EventDescription.create(metadata);
      
      expect(description).toBeDefined();
      expect(description.value).toBeDefined();
    });

    it('無効なJSON文字列で作成しようとするとエラーを投げる', () => {
      expect(() => {
        EventDescription.fromString('invalid-json');
      }).toThrow('EventDescription value must be valid JSON');
    });
  });

  describe('parse', () => {
    it('有効なJSON文字列からメタデータを解析できる', () => {
      const metadata = WorkStateMetadata.create(version, mockTabs, savedAt);
      const description = EventDescription.create(metadata);
      const parsed = EventDescription.parse(description.value);
      
      expect(parsed).toBeDefined();
      expect(parsed.version.equals(version)).toBe(true);
    });

    it('無効なJSON文字列で解析しようとするとエラーを投げる', () => {
      expect(() => {
        EventDescription.parse('invalid-json');
      }).toThrow('Failed to parse JSON');
    });

    it('バージョンフィールドがないJSON文字列で解析しようとするとエラーを投げる', () => {
      expect(() => {
        EventDescription.parse('{"tabs": []}');
      }).toThrow('EventDescription must contain a version field');
    });
  });

  describe('tryParse', () => {
    it('有効なJSON文字列からメタデータを解析できる', () => {
      const metadata = WorkStateMetadata.create(version, mockTabs, savedAt);
      const description = EventDescription.create(metadata);
      const result = EventDescription.tryParse(description.value);
      
      expect(result.metadata).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('無効なJSON文字列で解析するとエラーを返す', () => {
      const result = EventDescription.tryParse('invalid-json');
      
      expect(result.metadata).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].errorCode).toBe('INVALID_JSON');
    });

    it('バージョンフィールドがないJSON文字列で解析するとエラーを返す', () => {
      const result = EventDescription.tryParse('{"tabs": []}');
      
      expect(result.metadata).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].errorCode).toBe('MISSING_FIELD');
    });
  });

  describe('等価性', () => {
    it('同じ値の説明は等しい', () => {
      const metadata = WorkStateMetadata.create(version, mockTabs, savedAt);
      const description1 = EventDescription.create(metadata);
      const description2 = EventDescription.create(metadata);
      
      expect(description1.equals(description2)).toBe(true);
    });

    it('異なる値の説明は等しくない', () => {
      const metadata1 = WorkStateMetadata.create(version, mockTabs, savedAt);
      const metadata2 = WorkStateMetadata.create(version, mockTabs, new Date());
      const description1 = EventDescription.create(metadata1);
      const description2 = EventDescription.create(metadata2);
      
      expect(description1.equals(description2)).toBe(false);
    });
  });
});
