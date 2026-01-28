import { ChromeTabsAdapter } from '../../../src/infrastructure/adapters/chrome-tabs-adapter';
import { Logger } from '../../../src/infrastructure/adapters/logger';

describe('ChromeTabsAdapter', () => {
  let adapter: ChromeTabsAdapter;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    adapter = new ChromeTabsAdapter(logger);

    // Chrome APIのモック
    global.chrome = {
      tabs: {
        query: jest.fn(),
        get: jest.fn(),
      },
      runtime: {
        lastError: undefined,
      },
    } as unknown as typeof chrome;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentWindowTabs', () => {
    it('should get current window tabs successfully', async () => {
      const tabs = [
        {
          id: 1,
          url: 'https://example.com',
          title: 'Example Page',
          index: 0,
        },
      ] as unknown as chrome.tabs.Tab[];

      (chrome.tabs.query as jest.Mock).mockResolvedValue(tabs);

      const result = await adapter.getCurrentWindowTabs();

      expect(chrome.tabs.query).toHaveBeenCalledWith({ currentWindow: true });
      expect(result).toEqual(tabs);
    });

    it('should get tabs for specific window', async () => {
      const windowId = 12345;
      const tabs = [
        {
          id: 1,
          url: 'https://example.com',
          title: 'Example Page',
          index: 0,
        },
      ] as unknown as chrome.tabs.Tab[];

      (chrome.tabs.query as jest.Mock).mockResolvedValue(tabs);

      const result = await adapter.getCurrentWindowTabs(windowId);

      expect(chrome.tabs.query).toHaveBeenCalledWith({ windowId });
      expect(result).toEqual(tabs);
    });

    it('should throw error if query fails', async () => {
      const error = new Error('Permission denied');
      (chrome.tabs.query as jest.Mock).mockRejectedValue(error);

      await expect(adapter.getCurrentWindowTabs()).rejects.toThrow('Failed to get current window tabs');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getTab', () => {
    it('should get tab successfully', async () => {
      const tabId = 1;
      const tab = {
        id: tabId,
        url: 'https://example.com',
        title: 'Example Page',
        index: 0,
      } as unknown as chrome.tabs.Tab;

      (chrome.tabs.get as jest.Mock).mockResolvedValue(tab);

      const result = await adapter.getTab(tabId);

      expect(chrome.tabs.get).toHaveBeenCalledWith(tabId);
      expect(result).toEqual(tab);
    });

    it('should throw error if tab not found', async () => {
      const tabId = 999;
      (chrome.tabs.get as jest.Mock).mockRejectedValue(new Error('No tab with id: 999'));

      await expect(adapter.getTab(tabId)).rejects.toThrow('Failed to get tab');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getFaviconUrl', () => {
    it('should get favicon URL successfully', async () => {
      const tabId = 1;
      const faviconUrl = 'https://example.com/favicon.ico';
      const tab = {
        id: tabId,
        url: 'https://example.com',
        title: 'Example Page',
        favIconUrl: faviconUrl,
        index: 0,
      } as unknown as chrome.tabs.Tab;

      (chrome.tabs.get as jest.Mock).mockResolvedValue(tab);

      const result = await adapter.getFaviconUrl(tabId);

      expect(result).toBe(faviconUrl);
    });

    it('should return undefined if favicon URL is not available', async () => {
      const tabId = 1;
      const tab = {
        id: tabId,
        url: 'https://example.com',
        title: 'Example Page',
        index: 0,
      } as unknown as chrome.tabs.Tab;

      (chrome.tabs.get as jest.Mock).mockResolvedValue(tab);

      const result = await adapter.getFaviconUrl(tabId);

      expect(result).toBeUndefined();
    });

    it('should return undefined and log warning if error occurs', async () => {
      const tabId = 1;
      (chrome.tabs.get as jest.Mock).mockRejectedValue(new Error('Tab not found'));

      const result = await adapter.getFaviconUrl(tabId);

      expect(result).toBeUndefined();
      expect(logger.warn).toHaveBeenCalled();
    });
  });
});
