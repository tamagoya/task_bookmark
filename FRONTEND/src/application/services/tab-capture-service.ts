import { TabInfo } from '../../domain/value-objects/tab-info';
import { TabInfoFactory } from '../../domain/factories/tab-info-factory';
import { TabsCaptured } from '../../domain/events/tabs-captured';
import { ChromeTabsAdapter } from '../../infrastructure/adapters/chrome-tabs-adapter';
import { ChromeWindowsAdapter } from '../../infrastructure/adapters/chrome-windows-adapter';
import { Logger } from '../../infrastructure/adapters/logger';
import { EventHandler } from '../handlers/event-handler';

/**
 * TabCaptureService
 * タブ情報の取得と構造化を担当するアプリケーションサービス
 */
export class TabCaptureService {
  constructor(
    private readonly tabsAdapter: ChromeTabsAdapter,
    private readonly windowsAdapter: ChromeWindowsAdapter,
    private readonly logger: Logger,
    private readonly eventHandler: EventHandler
  ) {}

  /**
   * 現在のウィンドウのタブ情報を取得
   * @returns タブ情報の配列
   * @throws タブ取得エラー
   */
  async getCurrentWindowTabs(): Promise<TabInfo[]> {
    try {
      const startTime = Date.now();

      // 現在のウィンドウIDを取得
      const windowId = await this.windowsAdapter.getCurrentWindowId();

      // 現在のウィンドウのタブ情報を一括取得
      const chromeTabs = await this.tabsAdapter.getCurrentWindowTabs(windowId);

      // Chrome Tabs APIのデータをTabInfoに変換
      const tabInfos: TabInfo[] = [];
      for (const chromeTab of chromeTabs) {
        try {
          const tabInfo = TabInfoFactory.createFromChromeTab(chromeTab);
          tabInfos.push(tabInfo);
        } catch (error) {
          // 個別のタブの変換エラーはログに記録して続行
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(`Failed to create TabInfo from Chrome Tab ${chromeTab.id}: ${errorMessage}`);
        }
      }

      // パフォーマンスログ
      const duration = Date.now() - startTime;
      this.logger.info(`Captured ${tabInfos.length} tabs in ${duration}ms`);

      // TabsCaptured Domain Eventを発行
      if (tabInfos.length > 0) {
        const event = new TabsCaptured(tabInfos, windowId, new Date());
        await this.eventHandler.handleTabsCaptured(event);
      }

      return tabInfos;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get current window tabs: ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage));
      throw error;
    }
  }

  /**
   * 特定のタブの情報を取得
   * @param tabId タブID
   * @returns タブ情報
   * @throws タブ取得エラー
   */
  async getTabInfo(tabId: number): Promise<TabInfo> {
    try {
      const chromeTab = await this.tabsAdapter.getTab(tabId);
      return TabInfoFactory.createFromChromeTab(chromeTab);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get tab info ${tabId}: ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage));
      throw error;
    }
  }

  /**
   * タブのファビコンURLを取得
   * @param tabId タブID
   * @returns ファビコンURL（取得できない場合はundefined）
   */
  async getFaviconUrl(tabId: number): Promise<string | undefined> {
    try {
      return await this.tabsAdapter.getFaviconUrl(tabId);
    } catch (error) {
      // ファビコン取得エラーは無視してundefinedを返す
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to get favicon URL for tab ${tabId}: ${errorMessage}`);
      return undefined;
    }
  }

  /**
   * 現在のウィンドウのタブを閉じる
   * @throws タブ取得エラー、タブを閉じる際のエラー
   * @note エラーが発生した場合でも、可能な限りタブを閉じる処理を続行する
   */
  async closeCurrentWindowTabs(): Promise<void> {
    try {
      // 現在のウィンドウIDを取得
      const windowId = await this.windowsAdapter.getCurrentWindowId();

      // 現在のウィンドウのタブ情報を取得
      const chromeTabs = await this.tabsAdapter.getCurrentWindowTabs(windowId);

      if (chromeTabs.length === 0) {
        this.logger.debug('No tabs to close in current window');
        return;
      }

      // タブIDの配列を取得
      const tabIds = chromeTabs
        .map((tab) => tab.id)
        .filter((id): id is number => id !== undefined);

      if (tabIds.length === 0) {
        this.logger.debug('No valid tab IDs to close');
        return;
      }

      // タブを閉じる
      await this.tabsAdapter.closeTabs(tabIds);
      this.logger.info(`Closed ${tabIds.length} tabs in current window`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to close current window tabs: ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage));
      // エラーを再スローしない（保存処理は成功しているため）
      // エラーはログに記録するだけで、呼び出し元には影響を与えない
    }
  }
}
