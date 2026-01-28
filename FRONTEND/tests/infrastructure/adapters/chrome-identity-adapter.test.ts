import { ChromeIdentityAdapter } from '../../../src/infrastructure/adapters/chrome-identity-adapter';

// Chrome Identity APIのモック
const mockChromeIdentity = {
  getAuthToken: jest.fn(),
  removeCachedAuthToken: jest.fn(),
};

const mockChromeRuntime = {
  lastError: undefined as chrome.runtime.LastError | undefined,
};

// @ts-expect-error - Chrome APIのモック
global.chrome = {
  identity: mockChromeIdentity,
  runtime: mockChromeRuntime,
} as typeof chrome;

describe('ChromeIdentityAdapter', () => {
  let adapter: ChromeIdentityAdapter;

  beforeEach(() => {
    adapter = new ChromeIdentityAdapter();
    jest.clearAllMocks();
    mockChromeRuntime.lastError = undefined;
  });

  describe('getAuthToken', () => {
    it('正常にトークンを取得できる', async () => {
      const expectedToken = 'test-access-token';
      mockChromeIdentity.getAuthToken.mockImplementation((_options, callback) => {
        callback(expectedToken);
      });

      const token = await adapter.getAuthToken();

      expect(token).toBe(expectedToken);
      expect(mockChromeIdentity.getAuthToken).toHaveBeenCalledWith(
        { interactive: true },
        expect.any(Function)
      );
    });

    it('エラーが発生した場合はエラーを投げる', async () => {
      const errorMessage = 'Authentication failed';
      mockChromeIdentity.getAuthToken.mockImplementation((_options, callback) => {
        mockChromeRuntime.lastError = { message: errorMessage };
        callback(undefined);
      });

      await expect(adapter.getAuthToken()).rejects.toThrow(errorMessage);
      mockChromeRuntime.lastError = undefined;
    });
  });

  describe('removeCachedAuthToken', () => {
    it('キャッシュされたトークンを削除できる', async () => {
      const token = 'test-token';
      mockChromeIdentity.removeCachedAuthToken.mockImplementation((_options, callback) => {
        callback();
      });

      await adapter.removeCachedAuthToken(token);

      expect(mockChromeIdentity.removeCachedAuthToken).toHaveBeenCalledWith(
        { token },
        expect.any(Function)
      );
    });

    it('エラーが発生した場合はエラーを投げる', async () => {
      const token = 'test-token';
      const errorMessage = 'Failed to remove token';
      mockChromeIdentity.removeCachedAuthToken.mockImplementation((_options, callback) => {
        mockChromeRuntime.lastError = { message: errorMessage };
        callback();
      });

      await expect(adapter.removeCachedAuthToken(token)).rejects.toThrow(errorMessage);
      mockChromeRuntime.lastError = undefined;
    });
  });
});
