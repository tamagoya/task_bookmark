import { EventDescription } from '../../../src/domain/value-objects/event-description';
import { WorkStateMetadata } from '../../../src/domain/value-objects/work-state-metadata';
import { SchemaVersion } from '../../../src/domain/value-objects/schema-version';
import { TabInfo } from '../../../src/domain/value-objects/tab-info';

describe('EventDescription', () => {
  const mockTabs: TabInfo[] = [
    TabInfo.create({
      url: 'https://example.com',
      title: 'Example Page',
      index: 0,
    }),
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

  describe('文字数制限', () => {
    it('MAX_LENGTH が定義されている', () => {
      expect(EventDescription.MAX_LENGTH).toBe(8000);
    });

    it('制限内のメタデータは作成できる', () => {
      const metadata = WorkStateMetadata.create(version, mockTabs, savedAt);
      expect(() => EventDescription.create(metadata)).not.toThrow();
    });

    it('制限を超えるメタデータは作成時にエラーを投げる', () => {
      // 大量のタブを作成して制限を超える
      const manyTabs: TabInfo[] = [];
      for (let i = 0; i < 80; i++) {
        manyTabs.push(
          TabInfo.create({
            url: `https://example-very-long-domain-name-for-testing-purpose-${i}.com/path/to/page?query=value&another=param`,
            title: `Very Long Page Title for Testing Purpose Number ${i} - This is a long title`,
            faviconUrl: `https://example-very-long-domain-name-for-testing-purpose-${i}.com/favicon.ico`,
            index: i,
          })
        );
      }
      const largeMetadata = WorkStateMetadata.create(version, manyTabs, savedAt);

      expect(() => EventDescription.create(largeMetadata)).toThrow(
        /保存データが Google Calendar の文字数制限/
      );
    });

    it('estimateLength がメタデータの推定文字数を返す', () => {
      const metadata = WorkStateMetadata.create(version, mockTabs, savedAt);
      const length = EventDescription.estimateLength(metadata);
      expect(length).toBeGreaterThan(0);
      expect(typeof length).toBe('number');
    });

    it('isWithinLimit が制限内ならtrue、超過ならfalseを返す', () => {
      const metadata = WorkStateMetadata.create(version, mockTabs, savedAt);
      expect(EventDescription.isWithinLimit(metadata)).toBe(true);
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
