import { PerformanceMetric } from '../value-objects/performance-metric';
import { PerformanceThreshold } from '../value-objects/performance-threshold';

/**
 * PerformanceThresholdExceeded Domain Event
 * パフォーマンス閾値を超えた時に発行されるイベント
 */
export class PerformanceThresholdExceeded {
  constructor(
    public readonly eventId: string,
    public readonly operationName: string,
    public readonly metric: PerformanceMetric,
    public readonly threshold: PerformanceThreshold,
    public readonly exceededBy: number,
    public readonly occurredAt: Date
  ) {}

  /**
   * PerformanceThresholdExceededを作成
   * @param metric 超過したメトリクス
   * @param threshold 超過した閾値
   * @param exceededBy 超過量（%）
   * @returns PerformanceThresholdExceededインスタンス
   */
  static create(
    metric: PerformanceMetric,
    threshold: PerformanceThreshold,
    exceededBy: number
  ): PerformanceThresholdExceeded {
    // 一意のイベントIDを生成（簡易実装: タイムスタンプ + ランダム文字列）
    const eventId = `perf-threshold-exceeded-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    return new PerformanceThresholdExceeded(
      eventId,
      metric.operationName,
      metric,
      threshold,
      exceededBy,
      new Date()
    );
  }
}
