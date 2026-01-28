import { Logger } from './logger';

/**
 * ChromeTabsAdapter
 * Chrome Tabs APIのラッパー
 */
export class ChromeTabsAdapter {
  constructor(private readonly logger: Logger) {}

  /**
   * 現在のウィンドウのタブ情報を一括取得
   * @param windowId ウィンドウID（省略時は現在のウィンドウ）
   * @returns タブ情報の配列
   * @throws 権限エラー、タブ取得エラー
   */
  async getCurrentWindowTabs(windowId?: number): Promise<chrome.tabs.Tab[]> {
    try {
      const queryInfo: chrome.tabs.QueryInfo = windowId
        ? { windowId }
        : { currentWindow: true };

      const tabs = await chrome.tabs.query(queryInfo);
      return tabs;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get current window tabs: ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage));
      throw new Error(`Failed to get current window tabs: ${errorMessage}`);
    }
  }

  /**
   * 特定のタブの情報を取得
   * @param tabId タブID
   * @returns タブ情報
   * @throws タブが見つからない場合のエラー
   */
  async getTab(tabId: number): Promise<chrome.tabs.Tab> {
    try {
      const tab = await chrome.tabs.get(tabId);
      return tab;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get tab ${tabId}: ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage));
      throw new Error(`Failed to get tab ${tabId}: ${errorMessage}`);
    }
  }

  /**
   * タブのファビコンURLを取得
   * @param tabId タブID
   * @returns ファビコンURL（取得できない場合はundefined）
   */
  async getFaviconUrl(tabId: number): Promise<string | undefined> {
    try {
      const tab = await chrome.tabs.get(tabId);
      return tab.favIconUrl;
    } catch (error) {
      // ファビコン取得エラーは無視してundefinedを返す
      this.logger.warn(`Failed to get favicon URL for tab ${tabId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return undefined;
    }
  }
}
