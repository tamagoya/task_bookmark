import { TabRestoreManager } from '../../../src/application/services/tab-restore-manager';
import { ChromeTabsAdapter } from '../../../src/infrastructure/adapters/chrome-tabs-adapter';
import { Logger } from '../../../src/infrastructure/adapters/logger';
import { TabInfo } from '../../../src/domain/value-objects/tab-info';

describe('TabRestoreManager', () => {
  let manager: TabRestoreManager;
  let tabsAdapter: jest.Mocked<ChromeTabsAdapter>;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    tabsAdapter = {
      createTab: jest.fn(),
    } as unknown as jest.Mocked<ChromeTabsAdapter>;

    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    manager = new TabRestoreManager(tabsAdapter, logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('restoreTabsInOrder', () => {
    it('should restore tabs in order successfully', async () => {
      const windowId = 12345;
      const tabs = [
        TabInfo.create({ url: 'https://example.com', title: 'Example', index: 0 }),
        TabInfo.create({ url: 'https://example.org', title: 'Example Org', index: 1 }),
        TabInfo.create({ url: 'https://example.net', title: 'Example Net', index: 2 }),
      ];

      const chromeTabs = tabs.map((tab, index) => ({
        id: index + 1,
        url: tab.url,
        title: tab.title,
        windowId,
        index: tab.index,
      })) as unknown as chrome.tabs.Tab[];

      (tabsAdapter.createTab as jest.Mock)
        .mockResolvedValueOnce(chromeTabs[0])
        .mockResolvedValueOnce(chromeTabs[1])
        .mockResolvedValueOnce(chromeTabs[2]);

      const result = await manager.restoreTabsInOrder(tabs, windowId);

      expect(tabsAdapter.createTab).toHaveBeenCalledTimes(3);
      expect(tabsAdapter.createTab).toHaveBeenNthCalledWith(1, windowId, tabs[0].url, tabs[0].index);
      expect(tabsAdapter.createTab).toHaveBeenNthCalledWith(2, windowId, tabs[1].url, tabs[1].index);
      expect(tabsAdapter.createTab).toHaveBeenNthCalledWith(3, windowId, tabs[2].url, tabs[2].index);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should restore tabs in batches for large number of tabs (20+)', async () => {
      const windowId = 12345;
      const tabs = Array.from({ length: 25 }, (_, i) =>
        TabInfo.create({ url: `https://example${i}.com`, title: `Page ${i}`, index: i })
      );

      const chromeTabs = tabs.map((tab, index) => ({
        id: index + 1,
        url: tab.url,
        title: tab.title,
        windowId,
        index: tab.index,
      })) as unknown as chrome.tabs.Tab[];

      let callIndex = 0;
      (tabsAdapter.createTab as jest.Mock).mockImplementation(() => {
        const result = Promise.resolve(chromeTabs[callIndex]);
        callIndex++;
        return result;
      });

      // 実際のタイマーを使用してテスト（段階的読み込みは100ms待機なので短時間で完了）
      const result = await manager.restoreTabsInOrder(tabs, windowId);

      // 25個すべてのタブが作成されること
      expect(tabsAdapter.createTab).toHaveBeenCalledTimes(25);
      expect(result).toHaveLength(25);
      expect(result).toEqual(chromeTabs.map(tab => tab.id));
    }, 10000); // タイムアウトを10秒に設定

    it('should skip failed tabs and continue', async () => {
      const windowId = 12345;
      const tabs = [
        TabInfo.create({ url: 'https://example.com', title: 'Example', index: 0 }),
        TabInfo.create({ url: 'https://example-fail.com', title: 'Will Fail', index: 1 }),
        TabInfo.create({ url: 'https://example.net', title: 'Example Net', index: 2 }),
      ];

      const chromeTabs = [
        { id: 1, url: tabs[0].url, title: tabs[0].title, windowId, index: tabs[0].index },
        { id: 3, url: tabs[2].url, title: tabs[2].title, windowId, index: tabs[2].index },
      ] as unknown as chrome.tabs.Tab[];

      (tabsAdapter.createTab as jest.Mock)
        .mockResolvedValueOnce(chromeTabs[0])
        .mockRejectedValueOnce(new Error('Invalid URL'))
        .mockResolvedValueOnce(chromeTabs[1]);

      const result = await manager.restoreTabsInOrder(tabs, windowId);

      expect(tabsAdapter.createTab).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(2);
      expect(result).toEqual([1, 3]);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should call onProgress callback', async () => {
      const windowId = 12345;
      const tabs = [
        TabInfo.create({ url: 'https://example.com', title: 'Example', index: 0 }),
        TabInfo.create({ url: 'https://example.org', title: 'Example Org', index: 1 }),
      ];

      const chromeTabs = tabs.map((tab, index) => ({
        id: index + 1,
        url: tab.url,
        title: tab.title,
        windowId,
        index: tab.index,
      })) as unknown as chrome.tabs.Tab[];

      (tabsAdapter.createTab as jest.Mock)
        .mockResolvedValueOnce(chromeTabs[0])
        .mockResolvedValueOnce(chromeTabs[1]);

      const onProgress = jest.fn();

      await manager.restoreTabsInOrder(tabs, windowId, onProgress);

      expect(onProgress).toHaveBeenCalledWith(1, 2);
      expect(onProgress).toHaveBeenCalledWith(2, 2);
    });

    it('should handle empty tabs array', async () => {
      const windowId = 12345;
      const tabs: TabInfo[] = [];

      const result = await manager.restoreTabsInOrder(tabs, windowId);

      expect(tabsAdapter.createTab).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
