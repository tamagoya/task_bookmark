import { TabInfo } from '../../../src/domain/value-objects/tab-info';
import {
  CapturedTabEntry,
  extractTabsFromEntries,
  filterEntriesBySelectedTabIds,
} from '../../../src/application/types/captured-tab-entry';

function createEntry(
  tabId: number,
  windowId: number,
  url: string,
  withTabInfo = true
): CapturedTabEntry {
  return {
    tabId,
    windowId,
    url,
    title: `Title ${tabId}`,
    index: 0,
    tabInfo: withTabInfo
      ? TabInfo.create({ url, title: `Title ${tabId}`, index: 0 })
      : null,
  };
}

describe('captured-tab-entry utilities', () => {
  const entries: CapturedTabEntry[] = [
    createEntry(1, 100, 'https://example.com'),
    createEntry(2, 100, 'https://other.com'),
    createEntry(3, 200, 'https://third.com'),
  ];

  describe('filterEntriesBySelectedTabIds', () => {
    it('should return all entries when selectedTabIds is undefined', () => {
      expect(filterEntriesBySelectedTabIds(entries, undefined)).toHaveLength(3);
    });

    it('should filter entries by selected tab IDs', () => {
      const filtered = filterEntriesBySelectedTabIds(entries, [1, 3]);
      expect(filtered.map((e) => e.tabId)).toEqual([1, 3]);
    });

    it('should return empty array when no IDs match', () => {
      expect(filterEntriesBySelectedTabIds(entries, [999])).toHaveLength(0);
    });

    it('should return empty array when selectedTabIds is empty', () => {
      expect(filterEntriesBySelectedTabIds(entries, [])).toHaveLength(0);
    });
  });

  describe('extractTabsFromEntries', () => {
    it('should extract tabs and tabIdUrlPairs', () => {
      const result = extractTabsFromEntries(entries);
      expect(result.tabs).toHaveLength(3);
      expect(result.tabIdUrlPairs).toEqual([
        { tabId: 1, url: 'https://example.com' },
        { tabId: 2, url: 'https://other.com' },
        { tabId: 3, url: 'https://third.com' },
      ]);
    });

    it('should skip tabInfo when null but keep tabIdUrlPairs', () => {
      const mixed = [createEntry(1, 100, 'https://example.com', false)];
      const result = extractTabsFromEntries(mixed);
      expect(result.tabs).toHaveLength(0);
      expect(result.tabIdUrlPairs).toHaveLength(1);
    });
  });
});
