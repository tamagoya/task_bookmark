import { TabsCaptured } from '../../../src/domain/events/tabs-captured';
import { TabInfo } from '../../../src/domain/value-objects/tab-info';

describe('TabsCaptured', () => {
  describe('作成', () => {
    it('should create TabsCaptured with valid data', () => {
      const tabs = [
        TabInfo.create({
          url: 'https://example.com',
          title: 'Example Page',
          index: 0,
        }),
      ];
      const windowId = 12345;
      const capturedAt = new Date();

      const event = new TabsCaptured(tabs, windowId, capturedAt);

      expect(event.tabs).toEqual(tabs);
      expect(event.windowId).toBe(windowId);
      expect(event.capturedAt).toBe(capturedAt);
      expect(event.tabCount).toBe(1);
    });

    it('should calculate tabCount correctly', () => {
      const tabs = [
        TabInfo.create({
          url: 'https://example.com',
          title: 'Example Page',
          index: 0,
        }),
        TabInfo.create({
          url: 'https://other.com',
          title: 'Other Page',
          index: 1,
        }),
        TabInfo.create({
          url: 'https://third.com',
          title: 'Third Page',
          index: 2,
        }),
      ];
      const windowId = 12345;
      const capturedAt = new Date();

      const event = new TabsCaptured(tabs, windowId, capturedAt);

      expect(event.tabCount).toBe(3);
    });

    it('should throw error if tabs array is empty', () => {
      const tabs: TabInfo[] = [];
      const windowId = 12345;
      const capturedAt = new Date();

      expect(() => {
        new TabsCaptured(tabs, windowId, capturedAt);
      }).toThrow('Tabs array cannot be empty');
    });

    it('should throw error if windowId is negative', () => {
      const tabs = [
        TabInfo.create({
          url: 'https://example.com',
          title: 'Example Page',
          index: 0,
        }),
      ];
      const windowId = -1;
      const capturedAt = new Date();

      expect(() => {
        new TabsCaptured(tabs, windowId, capturedAt);
      }).toThrow('Window ID must be a non-negative integer');
    });

    it('should throw error if capturedAt is in the future', () => {
      const tabs = [
        TabInfo.create({
          url: 'https://example.com',
          title: 'Example Page',
          index: 0,
        }),
      ];
      const windowId = 12345;
      const futureDate = new Date(Date.now() + 10000); // 10秒後

      expect(() => {
        new TabsCaptured(tabs, windowId, futureDate);
      }).toThrow('CapturedAt cannot be in the future');
    });

    it('should accept capturedAt in the past', () => {
      const tabs = [
        TabInfo.create({
          url: 'https://example.com',
          title: 'Example Page',
          index: 0,
        }),
      ];
      const windowId = 12345;
      const pastDate = new Date(Date.now() - 10000); // 10秒前

      const event = new TabsCaptured(tabs, windowId, pastDate);

      expect(event.capturedAt).toBe(pastDate);
    });

    it('should accept capturedAt at current time', () => {
      const tabs = [
        TabInfo.create({
          url: 'https://example.com',
          title: 'Example Page',
          index: 0,
        }),
      ];
      const windowId = 12345;
      const now = new Date();

      const event = new TabsCaptured(tabs, windowId, now);

      expect(event.capturedAt).toBe(now);
    });
  });
});
