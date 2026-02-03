import { PerformanceMetric } from '../value-objects/performance-metric';

/**
 * PerformanceOptimized Domain Event
 * パフォーマンスが最適化された時に発行されるイベント
 */
export class PerformanceOptimized {
  constructor(
    public readonly eventId: string,
    public readonly operationName: string,
    public readonly beforeMetric: PerformanceMetric,
    public readonly afterMetric: PerformanceMetric,
    public readonly improvementPercent: number,
    public readonly optimizedAt: Date
  ) {}

  /**
   * PerformanceOptimizedを作成
   * @param beforeMetric 最適化前のメトリクス
   * @param afterMetric 最適化後のメトリクス
   * @param improvementPercent 改善率（%）
   * @returns PerformanceOptimizedインスタンス
   */
  static create(
    beforeMetric: PerformanceMetric,
    afterMetric: PerformanceMetric,
    improvementPercent: number
  ): PerformanceOptimized {
    // 一意のイベントIDを生成（簡易実装: タイムスタンプ + ランダム文字列）
    const eventId = `perf-optimized-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    return new PerformanceOptimized(
      eventId,
      beforeMetric.operationName,
      beforeMetric,
      afterMetric,
      improvementPercent,
      new Date()
    );
  }
}
