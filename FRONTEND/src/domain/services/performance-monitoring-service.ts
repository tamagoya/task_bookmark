import { PerformanceMetric } from '../value-objects/performance-metric';
import { PerformanceThreshold } from '../value-objects/performance-threshold';
import { PerformanceProfile } from '../value-objects/performance-profile';
import { PerformanceThresholdExceeded } from '../events/performance-threshold-exceeded';

/**
 * PerformanceMonitoringService (Domain Service)
 * パフォーマンス監視を担当するDomain Service
 * 純粋なビジネスロジックを提供（Repositoryへの依存なし）
 */
export class PerformanceMonitoringService {
  /**
   * パフォーマンス閾値をチェック
   * @param metric パフォーマンスメトリクス
   * @param threshold パフォーマンス閾値
   * @returns 閾値を超えた場合true
   */
  checkThreshold(
    metric: PerformanceMetric,
    threshold: PerformanceThreshold
  ): boolean {
    if (metric.operationName !== threshold.operationName) {
      return false;
    }

    return (
      metric.executionTimeMs > threshold.maxExecutionTimeMs ||
      metric.memoryUsageMB > threshold.maxMemoryUsageMB ||
      metric.cpuUsagePercent > threshold.maxCpuUsagePercent
    );
  }

  /**
   * 閾値超過イベントを作成
   * @param metric パフォーマンスメトリクス
   * @param threshold パフォーマンス閾値
   * @returns PerformanceThresholdExceededイベント
   */
  createThresholdExceededEvent(
    metric: PerformanceMetric,
    threshold: PerformanceThreshold
  ): PerformanceThresholdExceeded {
    const exceededBy = this.calculateExceededBy(metric, threshold);
    return PerformanceThresholdExceeded.create(metric, threshold, exceededBy);
  }

  /**
   * 超過量（%）を計算
   * @param metric パフォーマンスメトリクス
   * @param threshold パフォーマンス閾値
   * @returns 超過量（%）
   */
  private calculateExceededBy(
    metric: PerformanceMetric,
    threshold: PerformanceThreshold
  ): number {
    const executionTimeExceeded =
      metric.executionTimeMs > threshold.maxExecutionTimeMs
        ? ((metric.executionTimeMs - threshold.maxExecutionTimeMs) /
            threshold.maxExecutionTimeMs) *
          100
        : 0;

    const memoryExceeded =
      metric.memoryUsageMB > threshold.maxMemoryUsageMB
        ? ((metric.memoryUsageMB - threshold.maxMemoryUsageMB) /
            threshold.maxMemoryUsageMB) *
          100
        : 0;

    const cpuExceeded =
      metric.cpuUsagePercent > threshold.maxCpuUsagePercent
        ? ((metric.cpuUsagePercent - threshold.maxCpuUsagePercent) /
            threshold.maxCpuUsagePercent) *
          100
        : 0;

    return Math.max(executionTimeExceeded, memoryExceeded, cpuExceeded);
  }

  /**
   * パフォーマンスプロファイルを更新（統計計算）
   * @param existingProfile 既存のプロファイル（nullの場合は新規作成）
   * @param newMetric 新しいメトリクス
   * @returns 更新されたプロファイル
   */
  updateProfile(
    existingProfile: PerformanceProfile | null,
    newMetric: PerformanceMetric
  ): PerformanceProfile {
    if (!existingProfile) {
      // 新規プロファイルを作成
      return PerformanceProfile.create(
        newMetric.operationName,
        newMetric.executionTimeMs,
        newMetric.executionTimeMs,
        newMetric.executionTimeMs,
        newMetric.executionTimeMs,
        1,
        new Date()
      );
    }

    // 既存プロファイルを更新（簡易実装: 平均値のみ更新）
    const newSampleCount = existingProfile.sampleCount + 1;
    const newAverage =
      (existingProfile.averageExecutionTimeMs * existingProfile.sampleCount +
        newMetric.executionTimeMs) /
      newSampleCount;

    // パーセンタイルは簡易実装（実際の実装では、すべてのメトリクスを保持して計算）
    return PerformanceProfile.create(
      newMetric.operationName,
      newAverage,
      existingProfile.p50ExecutionTimeMs,
      existingProfile.p95ExecutionTimeMs,
      existingProfile.p99ExecutionTimeMs,
      newSampleCount,
      new Date()
    );
  }
}
