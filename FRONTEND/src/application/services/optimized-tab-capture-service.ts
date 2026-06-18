import { TabInfo } from '../../domain/value-objects/tab-info';
import { TabCaptureService } from './tab-capture-service';
import { CacheStrategy } from '../../domain/value-objects/cache-strategy';
import { ChromeWindowsAdapter } from '../../infrastructure/adapters/chrome-windows-adapter';
import { PerformanceInterceptor } from '../decorators/performance-interceptor';
import { CacheDecorator } from '../decorators/cache-decorator';
import { CapturedTabEntry } from '../types/captured-tab-entry';

/**
 * OptimizedTabCaptureService
 * パフォーマンス監視とキャッシュ機能が統合されたタブキャプチャサービス
 * 
 * ADR-026に準拠: Decoratorパターンで既存サービスをラップ
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
    private readonly baseService: TabCaptureService,
    private readonly windowsAdapter: ChromeWindowsAdapter,
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
      () => this.performanceInterceptor.intercept(
        'getCurrentWindowTabs',
        () => this.baseService.getCurrentWindowTabs()
      ),
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
      () => this.baseService.getTabInfo(tabId)
    );
  }

  /**
   * タブのファビコンURLを取得
   * @param tabId タブID
   * @returns ファビコンURL（取得できない場合はundefined）
   */
  async getFaviconUrl(tabId: number): Promise<string | undefined> {
    return this.baseService.getFaviconUrl(tabId);
  }

  /**
   * すべてのChromeウィンドウのタブエントリを取得（表示・保存用）
   */
  async getAllWindowsTabEntries(): Promise<CapturedTabEntry[]> {
    return this.performanceInterceptor.intercept(
      'getAllWindowsTabEntries',
      () => this.baseService.getAllWindowsTabEntries()
    );
  }

  /**
   * すべてのChromeウィンドウのタブ情報を取得（保存・一覧表示用）
   * キャッシュは使用しない（全ウィンドウは変更頻度が高いため）
   * @returns タブ情報の配列、タブIDの配列、tabId-URLのペア配列
   * @throws タブ取得エラー
   */
  async getAllWindowsTabs(): Promise<{
    tabs: TabInfo[];
    tabIds: number[];
    tabIdUrlPairs: Array<{ tabId: number; url: string }>;
  }> {
    return this.performanceInterceptor.intercept(
      'getAllWindowsTabs',
      () => this.baseService.getAllWindowsTabs()
    );
  }

  /**
   * 指定したタブIDのタブを一括で閉じる（保存成功後用）
   */
  async closeAllCapturedTabs(tabIds: number[]): Promise<void> {
    return this.performanceInterceptor.intercept(
      'closeAllCapturedTabs',
      () => this.baseService.closeAllCapturedTabs(tabIds)
    );
  }

  /**
   * 現在のウィンドウのタブを閉じる
   * パフォーマンス監視付き
   */
  async closeCurrentWindowTabs(): Promise<void> {
    return this.performanceInterceptor.intercept(
      'closeCurrentWindowTabs',
      () => this.baseService.closeCurrentWindowTabs()
    );
  }

  /**
   * タブキャッシュを無効化
   * タブが変更された場合に呼び出す
   */
  async invalidateTabsCache(): Promise<void> {
    await this.cacheDecorator.clearAll();
  }
}
