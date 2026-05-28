import { TabCaptureService } from '../../../src/application/services/tab-capture-service';
import { ChromeTabsAdapter } from '../../../src/infrastructure/adapters/chrome-tabs-adapter';
import { ChromeWindowsAdapter } from '../../../src/infrastructure/adapters/chrome-windows-adapter';
import { Logger } from '../../../src/infrastructure/adapters/logger';
import { EventHandler } from '../../../src/application/handlers/event-handler';
import { TabInfo } from '../../../src/domain/value-objects/tab-info';

describe('TabCaptureService', () => {
  let service: TabCaptureService;
  let tabsAdapter: jest.Mocked<ChromeTabsAdapter>;
  let windowsAdapter: jest.Mocked<ChromeWindowsAdapter>;
  let logger: jest.Mocked<Logger>;
  let eventHandler: jest.Mocked<EventHandler>;

  beforeEach(() => {
    tabsAdapter = {
      getCurrentWindowTabs: jest.fn(),
      getAllTabs: jest.fn(),
      getTab: jest.fn(),
      getFaviconUrl: jest.fn(),
      closeTab: jest.fn(),
      closeTabs: jest.fn(),
    } as unknown as jest.Mocked<ChromeTabsAdapter>;

    windowsAdapter = {
      getCurrentWindowId: jest.fn(),
      getWindow: jest.fn(),
    } as unknown as jest.Mocked<ChromeWindowsAdapter>;

    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    eventHandler = {
      handleTabsCaptured: jest.fn(),
    } as unknown as jest.Mocked<EventHandler>;

    service = new TabCaptureService(tabsAdapter, windowsAdapter, logger, eventHandler);
  });

  describe('getCurrentWindowTabs', () => {
    it('should get current window tabs successfully', async () => {
      const windowId = 12345;
      const chromeTabs = [
        {
          id: 1,
          url: 'https://example.com',
          title: 'Example Page',
          index: 0,
        },
        {
          id: 2,
          url: 'https://other.com',
          title: 'Other Page',
          index: 1,
        },
      ] as unknown as chrome.tabs.Tab[];

      windowsAdapter.getCurrentWindowId.mockResolvedValue(windowId);
      tabsAdapter.getCurrentWindowTabs.mockResolvedValue(chromeTabs);

      const result = await service.getCurrentWindowTabs();

      expect(windowsAdapter.getCurrentWindowId).toHaveBeenCalledTimes(1);
      expect(tabsAdapter.getCurrentWindowTabs).toHaveBeenCalledWith(windowId);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(TabInfo);
      expect(result[0].url).toBe('https://example.com');
      expect(result[1].url).toBe('https://other.com');
      expect(eventHandler.handleTabsCaptured).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalled();
    });

    it('should handle empty tabs array', async () => {
      const windowId = 12345;
      windowsAdapter.getCurrentWindowId.mockResolvedValue(windowId);
      tabsAdapter.getCurrentWindowTabs.mockResolvedValue([]);

      const result = await service.getCurrentWindowTabs();

      expect(result).toHaveLength(0);
      expect(eventHandler.handleTabsCaptured).not.toHaveBeenCalled();
    });

    it('should skip invalid tabs and continue', async () => {
      const windowId = 12345;
      const chromeTabs = [
        {
          id: 1,
          url: 'https://example.com',
          title: 'Example Page',
          index: 0,
        },
        {
          id: 2,
          url: 'invalid-url',
          title: 'Invalid Page',
          index: 1,
        },
        {
          id: 3,
          url: 'https://valid.com',
          title: 'Valid Page',
          index: 2,
        },
      ] as unknown as chrome.tabs.Tab[];

      windowsAdapter.getCurrentWindowId.mockResolvedValue(windowId);
      tabsAdapter.getCurrentWindowTabs.mockResolvedValue(chromeTabs);

      const result = await service.getCurrentWindowTabs();

      expect(result).toHaveLength(2);
      expect(result[0].url).toBe('https://example.com');
      expect(result[1].url).toBe('https://valid.com');
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should throw error if window ID cannot be obtained', async () => {
      windowsAdapter.getCurrentWindowId.mockRejectedValue(new Error('Failed to get window ID'));

      await expect(service.getCurrentWindowTabs()).rejects.toThrow('Failed to get window ID');
    });

    it('should throw error if tabs cannot be obtained', async () => {
      const windowId = 12345;
      windowsAdapter.getCurrentWindowId.mockResolvedValue(windowId);
      tabsAdapter.getCurrentWindowTabs.mockRejectedValue(new Error('Failed to get tabs'));

      await expect(service.getCurrentWindowTabs()).rejects.toThrow('Failed to get tabs');
    });
  });

  describe('getTabInfo', () => {
    it('should get tab info successfully', async () => {
      const tabId = 1;
      const chromeTab = {
        id: tabId,
        url: 'https://example.com',
        title: 'Example Page',
        index: 0,
      } as unknown as chrome.tabs.Tab;

      tabsAdapter.getTab.mockResolvedValue(chromeTab);

      const result = await service.getTabInfo(tabId);

      expect(tabsAdapter.getTab).toHaveBeenCalledWith(tabId);
      expect(result).toBeInstanceOf(TabInfo);
      expect(result.url).toBe('https://example.com');
      expect(result.title).toBe('Example Page');
    });

    it('should throw error if tab cannot be obtained', async () => {
      const tabId = 1;
      tabsAdapter.getTab.mockRejectedValue(new Error('Tab not found'));

      await expect(service.getTabInfo(tabId)).rejects.toThrow('Tab not found');
    });
  });

  describe('getFaviconUrl', () => {
    it('should get favicon URL successfully', async () => {
      const tabId = 1;
      const faviconUrl = 'https://example.com/favicon.ico';

      tabsAdapter.getFaviconUrl.mockResolvedValue(faviconUrl);

      const result = await service.getFaviconUrl(tabId);

      expect(tabsAdapter.getFaviconUrl).toHaveBeenCalledWith(tabId);
      expect(result).toBe(faviconUrl);
    });

    it('should return undefined if favicon cannot be obtained', async () => {
      const tabId = 1;
      tabsAdapter.getFaviconUrl.mockResolvedValue(undefined);

      const result = await service.getFaviconUrl(tabId);

      expect(result).toBeUndefined();
    });

    it('should return undefined and log warning if error occurs', async () => {
      const tabId = 1;
      tabsAdapter.getFaviconUrl.mockRejectedValue(new Error('Failed to get favicon'));

      const result = await service.getFaviconUrl(tabId);

      expect(result).toBeUndefined();
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('closeCurrentWindowTabs', () => {
    it('should close current window tabs successfully', async () => {
      const windowId = 12345;
      const chromeTabs = [
        {
          id: 1,
          url: 'https://example.com',
          title: 'Example Page',
          index: 0,
        },
        {
          id: 2,
          url: 'https://other.com',
          title: 'Other Page',
          index: 1,
        },
      ] as unknown as chrome.tabs.Tab[];

      windowsAdapter.getCurrentWindowId.mockResolvedValue(windowId);
      tabsAdapter.getCurrentWindowTabs.mockResolvedValue(chromeTabs);
      tabsAdapter.closeTabs.mockResolvedValue(undefined);

      await service.closeCurrentWindowTabs();

      expect(windowsAdapter.getCurrentWindowId).toHaveBeenCalledTimes(1);
      expect(tabsAdapter.getCurrentWindowTabs).toHaveBeenCalledWith(windowId);
      expect(tabsAdapter.closeTabs).toHaveBeenCalledWith([1, 2]);
      expect(logger.info).toHaveBeenCalledWith('Closed 2 tabs in current window');
    });

    it('should handle empty tabs array', async () => {
      const windowId = 12345;
      windowsAdapter.getCurrentWindowId.mockResolvedValue(windowId);
      tabsAdapter.getCurrentWindowTabs.mockResolvedValue([]);

      await service.closeCurrentWindowTabs();

      expect(tabsAdapter.closeTabs).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith('No tabs to close in current window');
    });

    it('should filter out tabs with undefined IDs', async () => {
      const windowId = 12345;
      const chromeTabs = [
        {
          id: 1,
          url: 'https://example.com',
          title: 'Example Page',
          index: 0,
        },
        {
          id: undefined,
          url: 'https://other.com',
          title: 'Other Page',
          index: 1,
        },
        {
          id: 3,
          url: 'https://third.com',
          title: 'Third Page',
          index: 2,
        },
      ] as unknown as chrome.tabs.Tab[];

      windowsAdapter.getCurrentWindowId.mockResolvedValue(windowId);
      tabsAdapter.getCurrentWindowTabs.mockResolvedValue(chromeTabs);
      tabsAdapter.closeTabs.mockResolvedValue(undefined);

      await service.closeCurrentWindowTabs();

      expect(tabsAdapter.closeTabs).toHaveBeenCalledWith([1, 3]);
      expect(logger.info).toHaveBeenCalledWith('Closed 2 tabs in current window');
    });

    it('should handle error gracefully without throwing', async () => {
      const windowId = 12345;
      const chromeTabs = [
        {
          id: 1,
          url: 'https://example.com',
          title: 'Example Page',
          index: 0,
        },
      ] as unknown as chrome.tabs.Tab[];

      windowsAdapter.getCurrentWindowId.mockResolvedValue(windowId);
      tabsAdapter.getCurrentWindowTabs.mockResolvedValue(chromeTabs);
      tabsAdapter.closeTabs.mockRejectedValue(new Error('Failed to close tabs'));

      // エラーが発生しても例外をスローしない
      await expect(service.closeCurrentWindowTabs()).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle error when getting window ID', async () => {
      windowsAdapter.getCurrentWindowId.mockRejectedValue(new Error('Failed to get window ID'));

      // エラーが発生しても例外をスローしない
      await expect(service.closeCurrentWindowTabs()).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle error when getting tabs', async () => {
      const windowId = 12345;
      windowsAdapter.getCurrentWindowId.mockResolvedValue(windowId);
      tabsAdapter.getCurrentWindowTabs.mockRejectedValue(new Error('Failed to get tabs'));

      // エラーが発生しても例外をスローしない
      await expect(service.closeCurrentWindowTabs()).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getAllWindowsTabs', () => {
    it('should get all windows tabs and return tabs with tabIds', async () => {
      const chromeTabs = [
        { id: 1, windowId: 1, url: 'https://example.com', title: 'Example', index: 0 },
        { id: 2, windowId: 2, url: 'https://other.com', title: 'Other', index: 0 },
      ] as unknown as chrome.tabs.Tab[];

      tabsAdapter.getAllTabs.mockResolvedValue(chromeTabs);

      const result = await service.getAllWindowsTabs();

      expect(tabsAdapter.getAllTabs).toHaveBeenCalledTimes(1);
      expect(result.tabs).toHaveLength(2);
      expect(result.tabIds).toEqual([1, 2]);
      expect(result.tabIdUrlPairs).toEqual([
        { tabId: 1, url: 'https://example.com' },
        { tabId: 2, url: 'https://other.com' },
      ]);
      expect(result.tabs[0]).toBeInstanceOf(TabInfo);
      expect(eventHandler.handleTabsCaptured).toHaveBeenCalledTimes(1);
      const event = eventHandler.handleTabsCaptured.mock.calls[0][0];
      expect(event.windowId).toBe(0);
    });

    it('should handle empty tabs array', async () => {
      tabsAdapter.getAllTabs.mockResolvedValue([]);

      const result = await service.getAllWindowsTabs();

      expect(result.tabs).toHaveLength(0);
      expect(result.tabIds).toHaveLength(0);
      expect(result.tabIdUrlPairs).toHaveLength(0);
      expect(eventHandler.handleTabsCaptured).not.toHaveBeenCalled();
    });

    it('should throw if getAllTabs fails', async () => {
      tabsAdapter.getAllTabs.mockRejectedValue(new Error('Failed to get tabs'));

      await expect(service.getAllWindowsTabs()).rejects.toThrow('Failed to get tabs');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to get all windows tabs'), expect.any(Error));
    });
  });

  describe('closeAllCapturedTabs', () => {
    it('should close tabs by ids', async () => {
      tabsAdapter.closeTabs.mockResolvedValue(undefined);

      await service.closeAllCapturedTabs([1, 2, 3]);

      expect(tabsAdapter.closeTabs).toHaveBeenCalledWith([1, 2, 3]);
      expect(logger.info).toHaveBeenCalledWith('Closed 3 tabs (all captured windows)');
    });

    it('should do nothing when tabIds is empty', async () => {
      await service.closeAllCapturedTabs([]);

      expect(tabsAdapter.closeTabs).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith('No tab IDs to close');
    });

    it('should not throw when closeTabs fails', async () => {
      tabsAdapter.closeTabs.mockRejectedValue(new Error('Failed to close'));

      await expect(service.closeAllCapturedTabs([1])).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
