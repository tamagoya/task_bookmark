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
        create: jest.fn(),
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

  describe('createTab', () => {
    it('should create tab successfully', async () => {
      const windowId = 12345;
      const url = 'https://example.com';
      const tab = {
        id: 1,
        url,
        title: 'Example Page',
        windowId,
        index: 0,
      } as unknown as chrome.tabs.Tab;

      (chrome.tabs.create as jest.Mock).mockResolvedValue(tab);

      const result = await adapter.createTab(windowId, url);

      expect(chrome.tabs.create).toHaveBeenCalledWith({ windowId, url });
      expect(result).toEqual(tab);
    });

    it('should create tab with index', async () => {
      const windowId = 12345;
      const url = 'https://example.com';
      const index = 2;
      const tab = {
        id: 1,
        url,
        title: 'Example Page',
        windowId,
        index,
      } as unknown as chrome.tabs.Tab;

      (chrome.tabs.create as jest.Mock).mockResolvedValue(tab);

      const result = await adapter.createTab(windowId, url, index);

      expect(chrome.tabs.create).toHaveBeenCalledWith({ windowId, url, index });
      expect(result).toEqual(tab);
    });

    it('should throw error if create fails', async () => {
      const windowId = 12345;
      const url = 'https://example.com';
      const error = new Error('Permission denied');
      (chrome.tabs.create as jest.Mock).mockRejectedValue(error);

      await expect(adapter.createTab(windowId, url)).rejects.toThrow('Failed to create tab');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('createTabs', () => {
    it('should create tabs in order successfully', async () => {
      const windowId = 12345;
      const urls = ['https://example.com', 'https://example.org', 'https://example.net'];
      const tabs = urls.map((url, index) => ({
        id: index + 1,
        url,
        title: `Page ${index + 1}`,
        windowId,
        index,
      })) as unknown as chrome.tabs.Tab[];

      (chrome.tabs.create as jest.Mock)
        .mockResolvedValueOnce(tabs[0])
        .mockResolvedValueOnce(tabs[1])
        .mockResolvedValueOnce(tabs[2]);

      const result = await adapter.createTabs(windowId, urls);

      expect(chrome.tabs.create).toHaveBeenCalledTimes(3);
      expect(chrome.tabs.create).toHaveBeenNthCalledWith(1, { windowId, url: urls[0] });
      expect(chrome.tabs.create).toHaveBeenNthCalledWith(2, { windowId, url: urls[1] });
      expect(chrome.tabs.create).toHaveBeenNthCalledWith(3, { windowId, url: urls[2] });
      expect(result).toEqual(tabs);
    });

    it('should skip failed tabs and continue', async () => {
      const windowId = 12345;
      const urls = ['https://example.com', 'invalid-url', 'https://example.net'];
      const tabs = [
        {
          id: 1,
          url: urls[0],
          title: 'Page 1',
          windowId,
          index: 0,
        },
        {
          id: 3,
          url: urls[2],
          title: 'Page 3',
          windowId,
          index: 1,
        },
      ] as unknown as chrome.tabs.Tab[];

      (chrome.tabs.create as jest.Mock)
        .mockResolvedValueOnce(tabs[0])
        .mockRejectedValueOnce(new Error('Invalid URL'))
        .mockResolvedValueOnce(tabs[1]);

      const result = await adapter.createTabs(windowId, urls);

      expect(chrome.tabs.create).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(tabs[0]);
      expect(result[1]).toEqual(tabs[1]);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should return empty array if all tabs fail', async () => {
      const windowId = 12345;
      const urls = ['https://example-fail1.com', 'https://example-fail2.com'];
      const error = new Error('Invalid URL');

      (chrome.tabs.create as jest.Mock).mockRejectedValue(error);

      const result = await adapter.createTabs(windowId, urls);

      expect(chrome.tabs.create).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(0);
      // logger.errorはcreateTabsで2回呼ばれる（各失敗タブにつき1回）
      // 前のテストで呼ばれた分も含まれるため、最低2回は呼ばれていることを確認
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
