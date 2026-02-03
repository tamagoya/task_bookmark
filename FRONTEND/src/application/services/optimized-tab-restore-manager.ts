import { ChromeTabsAdapter } from '../../infrastructure/adapters/chrome-tabs-adapter';
import { Logger } from '../../infrastructure/adapters/logger';
import { TabInfo } from '../../domain/value-objects/tab-info';
import { BatchSize } from '../../domain/value-objects/batch-size';
import { PerformanceOptimizationService } from '../../domain/services/performance-optimization-service';
import { PerformanceInterceptor } from '../decorators/performance-interceptor';

/**
 * OptimizedTabRestoreManager
 * パフォーマンス監視とバッチ処理最適化が統合されたタブ復元マネージャー
 * 
 * NFR要件:
 * - タブの復元（10個）: 5秒以内
 * - 大量タブ復元時のバッチ処理最適化
 */
export class OptimizedTabRestoreManager {
  // デフォルトのバッチサイズとディレイ
  private static readonly DEFAULT_BATCH_SIZE = 5;
  private static readonly LARGE_TAB_COUNT_THRESHOLD = 20;

  constructor(
    private readonly chromeTabsAdapter: ChromeTabsAdapter,
    private readonly logger: Logger,
    private readonly performanceInterceptor: PerformanceInterceptor,
    private readonly optimizationService: PerformanceOptimizationService
  ) {}

  /**
   * タブを順番通りに復元（パフォーマンス最適化付き）
   * @param tabs タブ情報の配列
   * @param windowId ウィンドウID
   * @param onProgress 進捗コールバック（任意）
   * @returns 作成されたタブIDの配列
   */
  async restoreTabsInOrder(
    tabs: TabInfo[],
    windowId: number,
    onProgress?: (completed: number, total: number) => void
  ): Promise<number[]> {
    return this.performanceInterceptor.intercept(
      'restoreTabsInOrder',
      async () => {
        if (tabs.length === 0) {
          return [];
        }

        const tabIds: number[] = [];
        const totalTabs = tabs.length;
        const useBatching = totalTabs >= OptimizedTabRestoreManager.LARGE_TAB_COUNT_THRESHOLD;

        // バッチサイズを最適化
        const batchConfig = await this.getOptimizedBatchConfig(totalTabs);

        if (useBatching) {
          this.logger.info(`Restoring ${totalTabs} tabs with batching (batch size: ${batchConfig.size}, delay: ${batchConfig.delayMs}ms)`);
          await this.restoreWithBatching(tabs, windowId, batchConfig, tabIds, totalTabs, onProgress);
        } else {
          this.logger.info(`Restoring ${totalTabs} tabs without batching`);
          await this.restoreWithoutBatching(tabs, windowId, tabIds, totalTabs, onProgress);
        }

        return tabIds;
      }
    );
  }

  /**
   * 最適化されたバッチ設定を取得
   */
  private async getOptimizedBatchConfig(totalTabs: number): Promise<BatchSize> {
    // Domain Serviceを使用してバッチサイズを最適化
    const optimizedBatchSize = this.optimizationService.optimizeBatchSize(
      'restoreTabsInOrder',
      OptimizedTabRestoreManager.DEFAULT_BATCH_SIZE,
      null // プロファイルがない場合はデフォルトを使用
    );

    this.logger.debug('Optimized batch config', {
      totalTabs,
      batchSize: optimizedBatchSize.size,
      delayMs: optimizedBatchSize.delayMs,
    });

    return optimizedBatchSize;
  }

  /**
   * バッチ処理でタブを復元
   */
  private async restoreWithBatching(
    tabs: TabInfo[],
    windowId: number,
    batchConfig: BatchSize,
    tabIds: number[],
    totalTabs: number,
    onProgress?: (completed: number, total: number) => void
  ): Promise<void> {
    const batchSize = batchConfig.size;
    const batchDelay = batchConfig.delayMs;

    for (let i = 0; i < tabs.length; i += batchSize) {
      const batch = tabs.slice(i, i + batchSize);

      for (const tab of batch) {
        await this.restoreSingleTab(tab, windowId, tabIds);

        if (onProgress) {
          onProgress(tabIds.length, totalTabs);
        }
      }

      // 最後のバッチでない場合は待機
      if (i + batchSize < tabs.length) {
        await this.delay(batchDelay);
      }
    }
  }

  /**
   * バッチなしでタブを復元
   */
  private async restoreWithoutBatching(
    tabs: TabInfo[],
    windowId: number,
    tabIds: number[],
    totalTabs: number,
    onProgress?: (completed: number, total: number) => void
  ): Promise<void> {
    for (const tab of tabs) {
      await this.restoreSingleTab(tab, windowId, tabIds);

      if (onProgress) {
        onProgress(tabIds.length, totalTabs);
      }
    }
  }

  /**
   * 単一のタブを復元
   */
  private async restoreSingleTab(
    tab: TabInfo,
    windowId: number,
    tabIds: number[]
  ): Promise<void> {
    try {
      const chromeTab = await this.chromeTabsAdapter.createTab(windowId, tab.url, tab.index);
      if (chromeTab.id) {
        tabIds.push(chromeTab.id);
      }
    } catch (error) {
      // エラーが発生したタブはスキップして続行
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to restore tab ${tab.url}: ${errorMessage}`,
        error instanceof Error ? error : new Error(errorMessage)
      );
    }
  }

  /**
   * 指定時間待機
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
