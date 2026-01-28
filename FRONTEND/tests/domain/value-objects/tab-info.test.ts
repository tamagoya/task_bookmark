import { TabInfo } from '../../../src/domain/value-objects/tab-info';

describe('TabInfo', () => {
  describe('create', () => {
    it('should create TabInfo with valid data', () => {
      const tabInfo = TabInfo.create({
        url: 'https://example.com',
        title: 'Example Page',
        faviconUrl: 'https://example.com/favicon.ico',
        index: 0,
      });

      expect(tabInfo.url).toBe('https://example.com');
      expect(tabInfo.title).toBe('Example Page');
      expect(tabInfo.faviconUrl).toBe('https://example.com/favicon.ico');
      expect(tabInfo.index).toBe(0);
      expect(tabInfo.extensions).toBeUndefined();
    });

    it('should create TabInfo without optional fields', () => {
      const tabInfo = TabInfo.create({
        url: 'https://example.com',
        title: 'Example Page',
        index: 0,
      });

      expect(tabInfo.url).toBe('https://example.com');
      expect(tabInfo.title).toBe('Example Page');
      expect(tabInfo.faviconUrl).toBeUndefined();
      expect(tabInfo.index).toBe(0);
      expect(tabInfo.extensions).toBeUndefined();
    });

    it('should create TabInfo with extensions field', () => {
      const extensions = { customField: 'value' };
      const tabInfo = TabInfo.create({
        url: 'https://example.com',
        title: 'Example Page',
        index: 0,
        extensions,
      });

      expect(tabInfo.extensions).toEqual(extensions);
    });

    it('should throw error if URL is empty', () => {
      expect(() => {
        TabInfo.create({
          url: '',
          title: 'Example Page',
          index: 0,
        });
      }).toThrow('URL cannot be empty');
    });

    it('should throw error if URL is invalid', () => {
      expect(() => {
        TabInfo.create({
          url: 'invalid-url',
          title: 'Example Page',
          index: 0,
        });
      }).toThrow('Invalid URL');
    });

    it('should accept chrome:// URLs', () => {
      const tabInfo = TabInfo.create({
        url: 'chrome://settings',
        title: 'Settings',
        index: 0,
      });

      expect(tabInfo.url).toBe('chrome://settings');
    });

    it('should accept chrome-extension:// URLs', () => {
      const tabInfo = TabInfo.create({
        url: 'chrome-extension://abcdefghijklmnopqrstuvwxyz123456/popup.html',
        title: 'Extension',
        index: 0,
      });

      expect(tabInfo.url).toBe('chrome-extension://abcdefghijklmnopqrstuvwxyz123456/popup.html');
    });

    it('should throw error if URL exceeds maximum length', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2048);
      expect(() => {
        TabInfo.create({
          url: longUrl,
          title: 'Example Page',
          index: 0,
        });
      }).toThrow('URL exceeds maximum length of 2048 characters');
    });

    it('should throw error if title is empty', () => {
      expect(() => {
        TabInfo.create({
          url: 'https://example.com',
          title: '',
          index: 0,
        });
      }).toThrow('Title cannot be empty');
    });

    it('should throw error if title contains only whitespace', () => {
      expect(() => {
        TabInfo.create({
          url: 'https://example.com',
          title: '   ',
          index: 0,
        });
      }).toThrow('Title cannot be empty');
    });

    it('should throw error if title exceeds maximum length', () => {
      const longTitle = 'a'.repeat(501);
      expect(() => {
        TabInfo.create({
          url: 'https://example.com',
          title: longTitle,
          index: 0,
        });
      }).toThrow('Title exceeds maximum length of 500 characters');
    });

    it('should throw error if index is negative', () => {
      expect(() => {
        TabInfo.create({
          url: 'https://example.com',
          title: 'Example Page',
          index: -1,
        });
      }).toThrow('Index must be a non-negative integer');
    });

    it('should throw error if index is not an integer', () => {
      expect(() => {
        TabInfo.create({
          url: 'https://example.com',
          title: 'Example Page',
          index: 1.5,
        });
      }).toThrow('Index must be a non-negative integer');
    });

    it('should accept valid index', () => {
      const tabInfo = TabInfo.create({
        url: 'https://example.com',
        title: 'Example Page',
        index: 0,
      });

      expect(tabInfo.index).toBe(0);
    });

    it('should normalize empty faviconUrl to undefined', () => {
      const tabInfo = TabInfo.create({
        url: 'https://example.com',
        title: 'Example Page',
        index: 0,
        faviconUrl: '',
      });

      expect(tabInfo.faviconUrl).toBeUndefined();
    });

    it('should normalize invalid faviconUrl to undefined', () => {
      const tabInfo = TabInfo.create({
        url: 'https://example.com',
        title: 'Example Page',
        index: 0,
        faviconUrl: 'invalid-url',
      });

      expect(tabInfo.faviconUrl).toBeUndefined();
    });
  });

  describe('equals', () => {
    it('should return true for equal TabInfo', () => {
      const tabInfo1 = TabInfo.create({
        url: 'https://example.com',
        title: 'Example Page',
        faviconUrl: 'https://example.com/favicon.ico',
        index: 0,
      });

      const tabInfo2 = TabInfo.create({
        url: 'https://example.com',
        title: 'Example Page',
        faviconUrl: 'https://example.com/favicon.ico',
        index: 0,
      });

      expect(tabInfo1.equals(tabInfo2)).toBe(true);
    });

    it('should return false for different URLs', () => {
      const tabInfo1 = TabInfo.create({
        url: 'https://example.com',
        title: 'Example Page',
        index: 0,
      });

      const tabInfo2 = TabInfo.create({
        url: 'https://other.com',
        title: 'Example Page',
        index: 0,
      });

      expect(tabInfo1.equals(tabInfo2)).toBe(false);
    });

    it('should return false for different titles', () => {
      const tabInfo1 = TabInfo.create({
        url: 'https://example.com',
        title: 'Example Page',
        index: 0,
      });

      const tabInfo2 = TabInfo.create({
        url: 'https://example.com',
        title: 'Other Page',
        index: 0,
      });

      expect(tabInfo1.equals(tabInfo2)).toBe(false);
    });

    it('should return false for different indices', () => {
      const tabInfo1 = TabInfo.create({
        url: 'https://example.com',
        title: 'Example Page',
        index: 0,
      });

      const tabInfo2 = TabInfo.create({
        url: 'https://example.com',
        title: 'Example Page',
        index: 1,
      });

      expect(tabInfo1.equals(tabInfo2)).toBe(false);
    });

    it('should return false for different faviconUrls', () => {
      const tabInfo1 = TabInfo.create({
        url: 'https://example.com',
        title: 'Example Page',
        faviconUrl: 'https://example.com/favicon.ico',
        index: 0,
      });

      const tabInfo2 = TabInfo.create({
        url: 'https://example.com',
        title: 'Example Page',
        faviconUrl: 'https://other.com/favicon.ico',
        index: 0,
      });

      expect(tabInfo1.equals(tabInfo2)).toBe(false);
    });

    it('should return false when one has faviconUrl and other does not', () => {
      const tabInfo1 = TabInfo.create({
        url: 'https://example.com',
        title: 'Example Page',
        faviconUrl: 'https://example.com/favicon.ico',
        index: 0,
      });

      const tabInfo2 = TabInfo.create({
        url: 'https://example.com',
        title: 'Example Page',
        index: 0,
      });

      expect(tabInfo1.equals(tabInfo2)).toBe(false);
    });

    it('should return false for null or undefined', () => {
      const tabInfo = TabInfo.create({
        url: 'https://example.com',
        title: 'Example Page',
        index: 0,
      });

      expect(tabInfo.equals(null as unknown as TabInfo)).toBe(false);
      expect(tabInfo.equals(undefined as unknown as TabInfo)).toBe(false);
    });

    it('should return true for equal TabInfo with extensions', () => {
      const extensions = { customField: 'value' };
      const tabInfo1 = TabInfo.create({
        url: 'https://example.com',
        title: 'Example Page',
        index: 0,
        extensions,
      });

      const tabInfo2 = TabInfo.create({
        url: 'https://example.com',
        title: 'Example Page',
        index: 0,
        extensions,
      });

      expect(tabInfo1.equals(tabInfo2)).toBe(true);
    });

    it('should return false for different extensions', () => {
      const tabInfo1 = TabInfo.create({
        url: 'https://example.com',
        title: 'Example Page',
        index: 0,
        extensions: { field1: 'value1' },
      });

      const tabInfo2 = TabInfo.create({
        url: 'https://example.com',
        title: 'Example Page',
        index: 0,
        extensions: { field2: 'value2' },
      });

      expect(tabInfo1.equals(tabInfo2)).toBe(false);
    });
  });
});
