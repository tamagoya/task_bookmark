import { ChromeWindowsAdapter } from '../../../src/infrastructure/adapters/chrome-windows-adapter';
import { Logger } from '../../../src/infrastructure/adapters/logger';

describe('ChromeWindowsAdapter', () => {
  let adapter: ChromeWindowsAdapter;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    adapter = new ChromeWindowsAdapter(logger);

    // Chrome APIのモック
    global.chrome = {
      windows: {
        getCurrent: jest.fn(),
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

  describe('getCurrentWindowId', () => {
    it('should get current window ID successfully', async () => {
      const windowId = 12345;
      const window = {
        id: windowId,
        focused: true,
        type: 'normal',
        state: 'normal',
      } as unknown as chrome.windows.Window;

      (chrome.windows.getCurrent as jest.Mock).mockResolvedValue(window);

      const result = await adapter.getCurrentWindowId();

      expect(chrome.windows.getCurrent).toHaveBeenCalled();
      expect(result).toBe(windowId);
    });

    it('should throw error if window ID is undefined', async () => {
      const window = {
        focused: true,
        type: 'normal',
        state: 'normal',
      } as unknown as chrome.windows.Window;

      (chrome.windows.getCurrent as jest.Mock).mockResolvedValue(window);

      await expect(adapter.getCurrentWindowId()).rejects.toThrow('Window ID is undefined');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should throw error if getCurrent fails', async () => {
      (chrome.windows.getCurrent as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await expect(adapter.getCurrentWindowId()).rejects.toThrow('Failed to get current window ID');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getWindow', () => {
    it('should get window successfully', async () => {
      const windowId = 12345;
      const window = {
        id: windowId,
        focused: true,
        type: 'normal',
        state: 'normal',
      } as unknown as chrome.windows.Window;

      (chrome.windows.get as jest.Mock).mockResolvedValue(window);

      const result = await adapter.getWindow(windowId);

      expect(chrome.windows.get).toHaveBeenCalledWith(windowId);
      expect(result).toEqual(window);
    });

    it('should throw error if window not found', async () => {
      const windowId = 999;
      (chrome.windows.get as jest.Mock).mockRejectedValue(new Error('No window with id: 999'));

      await expect(adapter.getWindow(windowId)).rejects.toThrow('Failed to get window');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
