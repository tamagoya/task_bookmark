import { Logger } from './logger';

/**
 * ChromeWindowsAdapter
 * Chrome Windows APIのラッパー
 */
export class ChromeWindowsAdapter {
  constructor(private readonly logger: Logger) {}

  /**
   * 現在のウィンドウIDを取得
   * @returns 現在のウィンドウID
   * @throws ウィンドウ取得エラー
   */
  async getCurrentWindowId(): Promise<number> {
    try {
      const window = await chrome.windows.getCurrent();
      if (!window.id) {
        throw new Error('Window ID is undefined');
      }
      return window.id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get current window ID: ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage));
      throw new Error(`Failed to get current window ID: ${errorMessage}`);
    }
  }

  /**
   * ウィンドウ情報を取得
   * @param windowId ウィンドウID
   * @returns ウィンドウ情報
   * @throws ウィンドウが見つからない場合のエラー
   */
  async getWindow(windowId: number): Promise<chrome.windows.Window> {
    try {
      const window = await chrome.windows.get(windowId);
      return window;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get window ${windowId}: ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage));
      throw new Error(`Failed to get window ${windowId}: ${errorMessage}`);
    }
  }
}
