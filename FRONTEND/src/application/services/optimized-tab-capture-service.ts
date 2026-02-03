import { TabInfo } from '../../domain/value-objects/tab-info';
import { TabInfoFactory } from '../../domain/factories/tab-info-factory';
import { CacheStrategy } from '../../domain/value-objects/cache-strategy';
import { TabsCaptured } from '../../domain/events/tabs-captured';
import { ChromeTabsAdapter } from '../../infrastructure/adapters/chrome-tabs-adapter';
import { ChromeWindowsAdapter } from '../../infrastructure/adapters/chrome-windows-adapter';
import { Logger } from '../../infrastructure/adapters/logger';
import { EventHandler } from '../handlers/event-handler';
import { PerformanceInterceptor } from '../decorators/performance-interceptor';
import { CacheDecorator } from '../decorators/cache-decorator';

/**
 * OptimizedTabCaptureService
 * パフォーマンス監視とキャッシュ機能が統合されたタブキャプチャサービス
 * 
 * NFR要件:
 * - タブ情報の取得: 500ms以内
 * - キャッシュTTL: 5秒（頻繁な更新を考慮）
 */
export class OptimizedTabCaptureService {
  // キャッシュ戦略: 5秒間キャッシュ（タブ情報は頻繁に変更される可能性があるため短め）
  private readonly tabsCacheStrategy = CacheStrategy.create(
    'getCurrentWindowTabs',
    5,
    10,
    'LRU'
  );

  constructor(
    private readonly tabsAdapter: ChromeTabsAdapter,
    private readonly windowsAdapter: ChromeWindowsAdapter,
    private readonly logger: Logger,
    private readonly eventHandler: EventHandler,
    private readonly performanceInterceptor: PerformanceInterceptor,
    private readonly cacheDecorator: CacheDecorator
  ) {}

  /**
   * 現在のウィンドウのタブ情報を取得
   * パフォーマンス監視: 500ms以内
   * キャッシュ: 5秒間
   * @returns タブ情報の配列
   * @throws タブ取得エラー
   */
  async getCurrentWindowTabs(): Promise<TabInfo[]> {
    // 現在のウィンドウIDを取得してキャッシュキーに使用
    const windowId = await this.windowsAdapter.getCurrentWindowId();
    const cacheParams = { windowId };

    return this.cacheDecorator.withCache(
      'getCurrentWindowTabs',
      cacheParams,
      async () => {
        return this.performanceInterceptor.intercept(
          'getCurrentWindowTabs',
          async () => {
            try {
              const startTime = Date.now();

              const chromeTabs = await this.tabsAdapter.getCurrentWindowTabs(windowId);

              const tabInfos: TabInfo[] = [];
              for (const chromeTab of chromeTabs) {
                try {
                  const tabInfo = TabInfoFactory.createFromChromeTab(chromeTab);
                  tabInfos.push(tabInfo);
                } catch (error) {
                  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                  this.logger.warn(`Failed to create TabInfo from Chrome Tab ${chromeTab.id}: ${errorMessage}`);
                }
              }

              const duration = Date.now() - startTime;
              this.logger.info(`Captured ${tabInfos.length} tabs in ${duration}ms`);

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
        );
      },
      this.tabsCacheStrategy
    );
  }

  /**
   * 特定のタブの情報を取得
   * @param tabId タブID
   * @returns タブ情報
   * @throws タブ取得エラー
   */
  async getTabInfo(tabId: number): Promise<TabInfo> {
    return this.performanceInterceptor.intercept(
      'getTabInfo',
      async () => {
        try {
          const chromeTab = await this.tabsAdapter.getTab(tabId);
          return TabInfoFactory.createFromChromeTab(chromeTab);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`Failed to get tab info ${tabId}: ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage));
          throw error;
        }
      }
    );
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to get favicon URL for tab ${tabId}: ${errorMessage}`);
      return undefined;
    }
  }

  /**
   * タブキャッシュを無効化
   * タブが変更された場合に呼び出す
   */
  async invalidateTabsCache(): Promise<void> {
    await this.cacheDecorator.clearAll();
    this.logger.debug('Tabs cache invalidated');
  }
}
