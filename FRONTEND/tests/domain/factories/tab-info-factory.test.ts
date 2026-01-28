import { TabInfoFactory } from '../../../src/domain/factories/tab-info-factory';
import { TabInfo } from '../../../src/domain/value-objects/tab-info';

describe('TabInfoFactory', () => {
  describe('createFromChromeTab', () => {
    it('should create TabInfo from valid Chrome Tab', () => {
      const chromeTab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example Page',
        favIconUrl: 'https://example.com/favicon.ico',
        index: 0,
      } as unknown as chrome.tabs.Tab;

      const tabInfo = TabInfoFactory.createFromChromeTab(chromeTab);

      expect(tabInfo).toBeInstanceOf(TabInfo);
      expect(tabInfo.url).toBe('https://example.com');
      expect(tabInfo.title).toBe('Example Page');
      expect(tabInfo.faviconUrl).toBe('https://example.com/favicon.ico');
      expect(tabInfo.index).toBe(0);
    });

    it('should create TabInfo without faviconUrl', () => {
      const chromeTab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example Page',
        index: 0,
      } as unknown as chrome.tabs.Tab;

      const tabInfo = TabInfoFactory.createFromChromeTab(chromeTab);

      expect(tabInfo.faviconUrl).toBeUndefined();
    });

    it('should throw error if URL is missing', () => {
      const chromeTab = {
        id: 1,
        title: 'Example Page',
        index: 0,
      } as unknown as chrome.tabs.Tab;

      expect(() => {
        TabInfoFactory.createFromChromeTab(chromeTab);
      }).toThrow('Invalid URL');
    });

    it('should throw error if URL is invalid', () => {
      const chromeTab = {
        id: 1,
        url: 'invalid-url',
        title: 'Example Page',
        index: 0,
      } as unknown as chrome.tabs.Tab;

      expect(() => {
        TabInfoFactory.createFromChromeTab(chromeTab);
      }).toThrow('Invalid URL');
    });

    it('should throw error if title is missing', () => {
      const chromeTab = {
        id: 1,
        url: 'https://example.com',
        index: 0,
      } as unknown as chrome.tabs.Tab;

      expect(() => {
        TabInfoFactory.createFromChromeTab(chromeTab);
      }).toThrow('Title cannot be empty');
    });

    it('should throw error if title is empty', () => {
      const chromeTab = {
        id: 1,
        url: 'https://example.com',
        title: '',
        index: 0,
      } as unknown as chrome.tabs.Tab;

      expect(() => {
        TabInfoFactory.createFromChromeTab(chromeTab);
      }).toThrow('Title cannot be empty');
    });

    it('should throw error if index is missing', () => {
      const chromeTab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example Page',
      } as unknown as chrome.tabs.Tab;

      expect(() => {
        TabInfoFactory.createFromChromeTab(chromeTab);
      }).toThrow('Invalid tab index');
    });

    it('should throw error if index is negative', () => {
      const chromeTab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example Page',
        index: -1,
      } as unknown as chrome.tabs.Tab;

      expect(() => {
        TabInfoFactory.createFromChromeTab(chromeTab);
      }).toThrow('Invalid tab index');
    });

    it('should accept chrome:// URLs', () => {
      const chromeTab = {
        id: 1,
        url: 'chrome://settings',
        title: 'Settings',
        index: 0,
      } as unknown as chrome.tabs.Tab;

      const tabInfo = TabInfoFactory.createFromChromeTab(chromeTab);

      expect(tabInfo.url).toBe('chrome://settings');
    });

    it('should accept chrome-extension:// URLs', () => {
      const chromeTab = {
        id: 1,
        url: 'chrome-extension://abcdefghijklmnopqrstuvwxyz123456/popup.html',
        title: 'Extension',
        index: 0,
      } as unknown as chrome.tabs.Tab;

      const tabInfo = TabInfoFactory.createFromChromeTab(chromeTab);

      expect(tabInfo.url).toBe('chrome-extension://abcdefghijklmnopqrstuvwxyz123456/popup.html');
    });

    it('should normalize empty faviconUrl to undefined', () => {
      const chromeTab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example Page',
        favIconUrl: '',
        index: 0,
      } as unknown as chrome.tabs.Tab;

      const tabInfo = TabInfoFactory.createFromChromeTab(chromeTab);

      expect(tabInfo.faviconUrl).toBeUndefined();
    });
  });

  describe('createFromRawData', () => {
    it('should create TabInfo from raw data', () => {
      const data = {
        url: 'https://example.com',
        title: 'Example Page',
        faviconUrl: 'https://example.com/favicon.ico',
        index: 0,
      };

      const tabInfo = TabInfoFactory.createFromRawData(data);

      expect(tabInfo).toBeInstanceOf(TabInfo);
      expect(tabInfo.url).toBe('https://example.com');
      expect(tabInfo.title).toBe('Example Page');
      expect(tabInfo.faviconUrl).toBe('https://example.com/favicon.ico');
      expect(tabInfo.index).toBe(0);
    });

    it('should create TabInfo without optional fields', () => {
      const data = {
        url: 'https://example.com',
        title: 'Example Page',
        index: 0,
      };

      const tabInfo = TabInfoFactory.createFromRawData(data);

      expect(tabInfo.faviconUrl).toBeUndefined();
      expect(tabInfo.extensions).toBeUndefined();
    });

    it('should create TabInfo with extensions', () => {
      const extensions = { customField: 'value' };
      const data = {
        url: 'https://example.com',
        title: 'Example Page',
        index: 0,
        extensions,
      };

      const tabInfo = TabInfoFactory.createFromRawData(data);

      expect(tabInfo.extensions).toEqual(extensions);
    });

    it('should throw error if URL is invalid', () => {
      const data = {
        url: 'invalid-url',
        title: 'Example Page',
        index: 0,
      };

      expect(() => {
        TabInfoFactory.createFromRawData(data);
      }).toThrow('Invalid URL');
    });

    it('should throw error if title is empty', () => {
      const data = {
        url: 'https://example.com',
        title: '',
        index: 0,
      };

      expect(() => {
        TabInfoFactory.createFromRawData(data);
      }).toThrow('Title cannot be empty');
    });

    it('should throw error if index is invalid', () => {
      const data = {
        url: 'https://example.com',
        title: 'Example Page',
        index: -1,
      };

      expect(() => {
        TabInfoFactory.createFromRawData(data);
      }).toThrow('Index must be a non-negative integer');
    });
  });
});
