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

  /**
   * 新しいタブを作成
   * @param windowId ウィンドウID
   * @param url URL
   * @param index タブの位置（省略時は最後）
   * @returns 作成されたタブ情報
   * @throws 権限エラー、タブ作成エラー
   */
  async createTab(windowId: number, url: string, index?: number): Promise<chrome.tabs.Tab> {
    try {
      const createProperties: chrome.tabs.CreateProperties = {
        windowId,
        url,
      };
      if (index !== undefined) {
        createProperties.index = index;
      }

      const tab = await chrome.tabs.create(createProperties);
      return tab;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create tab: ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage));
      throw new Error(`Failed to create tab: ${errorMessage}`);
    }
  }

  /**
   * 複数のタブを順番通りに作成
   * @param windowId ウィンドウID
   * @param urls URLの配列
   * @returns 作成されたタブ情報の配列
   * @throws 権限エラー
   * @note 順序保証のため、並列処理は行わない。エラーが発生したタブはスキップして続行する。
   */
  async createTabs(windowId: number, urls: string[]): Promise<chrome.tabs.Tab[]> {
    const tabs: chrome.tabs.Tab[] = [];

    for (const url of urls) {
      try {
        const tab = await this.createTab(windowId, url);
        tabs.push(tab);
      } catch (error) {
        // エラーが発生したタブはスキップして続行
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to create tab for URL ${url}: ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage));
      }
    }

    return tabs;
  }

  /**
   * タブを閉じる
   * @param tabId タブID
   * @throws 権限エラー、タブが見つからない場合のエラー
   */
  async closeTab(tabId: number): Promise<void> {
    try {
      await chrome.tabs.remove(tabId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to close tab ${tabId}: ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage));
      throw new Error(`Failed to close tab ${tabId}: ${errorMessage}`);
    }
  }

  /**
   * 複数のタブを一度に閉じる
   * @param tabIds タブIDの配列
   * @note エラーが発生したタブはスキップして続行する。全てのタブを閉じる処理は成功として扱う。
   */
  async closeTabs(tabIds: number[]): Promise<void> {
    if (tabIds.length === 0) {
      return;
    }

    try {
      // Chrome Tabs APIは配列を受け取って一度に閉じることができる
      await chrome.tabs.remove(tabIds);
    } catch (error) {
      // 一部のタブが閉じられなかった場合でも、エラーをログに記録して続行
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to close some tabs: ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage));
      
      // 個別に閉じることを試みる（一部のタブが既に閉じられている可能性がある）
      for (const tabId of tabIds) {
        try {
          await this.closeTab(tabId);
        } catch (individualError) {
          // 個別のエラーは無視して続行（タブが既に閉じられている可能性がある）
          const individualErrorMessage = individualError instanceof Error ? individualError.message : 'Unknown error';
          this.logger.debug(`Failed to close tab ${tabId}: ${individualErrorMessage}`);
        }
      }
    }
  }
}
