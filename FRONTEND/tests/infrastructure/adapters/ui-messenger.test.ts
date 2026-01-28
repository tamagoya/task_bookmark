import { UIMessenger, Message } from '../../../src/infrastructure/adapters/ui-messenger';

// Chrome Runtime APIのモック
const mockChromeRuntime = {
  sendMessage: jest.fn(),
  onMessage: {
    addListener: jest.fn(),
  },
};

// @ts-expect-error - Chrome APIのモック
global.chrome = {
  runtime: mockChromeRuntime,
} as typeof chrome;

describe('UIMessenger', () => {
  let messenger: UIMessenger;

  beforeEach(() => {
    messenger = new UIMessenger();
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('正常にメッセージを送信できる', async () => {
      const message: Message = {
        type: 'TEST_MESSAGE',
        payload: { data: 'test' },
      };

      mockChromeRuntime.sendMessage.mockImplementation((_msg, callback) => {
        callback?.();
      });

      await messenger.sendMessage(message);

      expect(mockChromeRuntime.sendMessage).toHaveBeenCalledWith(message);
    });

    it('メッセージ送信エラーが発生した場合、エラーをログに記録する', async () => {
      const message: Message = {
        type: 'TEST_MESSAGE',
        payload: { data: 'test' },
      };
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockChromeRuntime.sendMessage.mockImplementation(() => {
        throw new Error('Failed to send message');
      });

      await messenger.sendMessage(message);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to send message:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('onMessage', () => {
    it('メッセージを受信できる', () => {
      const callback = jest.fn();
      const message: Message = {
        type: 'TEST_MESSAGE',
        payload: { data: 'test' },
      };

      messenger.onMessage(callback);

      expect(mockChromeRuntime.onMessage.addListener).toHaveBeenCalled();
      
      // リスナーを呼び出す
      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();
      listener(message, {}, sendResponse);

      expect(callback).toHaveBeenCalledWith(message);
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    it('メッセージ処理エラーが発生した場合、エラーレスポンスを返す', () => {
      const callback = jest.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      const message: Message = {
        type: 'TEST_MESSAGE',
        payload: { data: 'test' },
      };
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      messenger.onMessage(callback);

      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();
      listener(message, {}, sendResponse);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error handling message:', expect.any(Error));
      expect(sendResponse).toHaveBeenCalledWith({ success: false, error: expect.any(String) });
      
      consoleErrorSpy.mockRestore();
    });
  });
});
