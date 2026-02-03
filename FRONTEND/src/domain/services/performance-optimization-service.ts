import { CacheStrategy } from '../value-objects/cache-strategy';
import { BatchSize } from '../value-objects/batch-size';
import { PerformanceProfile } from '../value-objects/performance-profile';

/**
 * PerformanceOptimizationService (Domain Service)
 * パフォーマンス最適化を担当するDomain Service
 * 純粋なビジネスロジックを提供（Repositoryへの依存なし）
 */
export class PerformanceOptimizationService {
  /**
   * キャッシュ戦略を最適化
   * @param operationName 操作名
   * @param profile パフォーマンスプロファイル（オプション）
   * @returns 最適化されたキャッシュ戦略
   */
  optimizeCacheStrategy(
    operationName: string,
    profile: PerformanceProfile | null
  ): CacheStrategy {
    // パフォーマンスプロファイルに基づいて最適なTTLを決定
    let ttlSeconds = 30; // デフォルト値
    let maxSize = 100; // デフォルト値

    if (profile) {
      // 平均実行時間が長い場合は、TTLを長くする
      if (profile.averageExecutionTimeMs > 1000) {
        ttlSeconds = 60;
      } else if (profile.averageExecutionTimeMs > 500) {
        ttlSeconds = 30;
      } else {
        ttlSeconds = 5;
      }

      // サンプル数が多い場合は、キャッシュサイズを増やす
      if (profile.sampleCount > 100) {
        maxSize = 200;
      }
    }

    return CacheStrategy.create(operationName, ttlSeconds, maxSize, 'LRU');
  }

  /**
   * バッチサイズを最適化
   * @param operationName 操作名
   * @param currentSize 現在のバッチサイズ
   * @param profile パフォーマンスプロファイル（オプション）
   * @returns 最適化されたバッチサイズ
   */
  optimizeBatchSize(
    operationName: string,
    currentSize: number,
    profile: PerformanceProfile | null
  ): BatchSize {
    let optimizedSize = currentSize;
    let delayMs = 100; // デフォルト値

    if (profile) {
      // 平均実行時間が長い場合は、バッチサイズを減らす
      if (profile.averageExecutionTimeMs > 2000) {
        optimizedSize = Math.max(1, currentSize - 2);
        delayMs = 200;
      } else if (profile.averageExecutionTimeMs > 1000) {
        optimizedSize = Math.max(1, currentSize - 1);
        delayMs = 150;
      }
    }

    return BatchSize.create(operationName, optimizedSize, delayMs);
  }

  /**
   * キャッシュを使用すべきか判定
   * @param operationName 操作名
   * @param profile パフォーマンスプロファイル（オプション）
   * @returns キャッシュを使用すべき場合true
   */
  shouldUseCache(
    _operationName: string,
    profile: PerformanceProfile | null
  ): boolean {
    // operationNameは将来の拡張用に保持（操作固有のキャッシュロジックなど）
    void _operationName;
    if (!profile) {
      // プロファイルがない場合は、デフォルトでキャッシュを使用
      return true;
    }

    // サンプル数が少ない場合は、キャッシュを使用しない
    if (profile.sampleCount < 10) {
      return false;
    }

    // 平均実行時間が短い場合は、キャッシュを使用しない（オーバーヘッドが大きい）
    if (profile.averageExecutionTimeMs < 50) {
      return false;
    }

    return true;
  }
}
