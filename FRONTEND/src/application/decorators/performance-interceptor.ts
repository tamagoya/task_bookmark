import { PerformanceMetric } from '../../domain/value-objects/performance-metric';
import { PerformanceThreshold } from '../../domain/value-objects/performance-threshold';
import { PerformanceMonitoringService as DomainMonitoringService } from '../../domain/services/performance-monitoring-service';
import { PerformanceMetricsRepository } from '../../infrastructure/repositories/performance-metrics-repository';
import { PerformanceMetricsCollector } from '../../infrastructure/adapters/performance-metrics-collector';
import { Logger } from '../../infrastructure/adapters/logger';

/**
 * PerformanceInterceptor
 * 既存のサービスメソッドにパフォーマンス監視を追加するインターセプター
 * Decorator パターンを使用
 */
export class PerformanceInterceptor {
  // NFR要件に基づくデフォルト閾値
  private readonly defaultThresholds: Map<string, PerformanceThreshold> =
    new Map();

  constructor(
    private readonly monitoringService: DomainMonitoringService,
    private readonly metricsRepository: PerformanceMetricsRepository,
    private readonly metricsCollector: PerformanceMetricsCollector,
    private readonly logger: Logger
  ) {
    // NFR要件に基づくデフォルト閾値を設定
    this.initializeDefaultThresholds();
  }

  /**
   * デフォルト閾値を初期化
   */
  private initializeDefaultThresholds(): void {
    // タブ情報の取得: 500ms以内
    this.defaultThresholds.set(
      'getCurrentWindowTabs',
      PerformanceThreshold.create('getCurrentWindowTabs', 500, 50, 5)
    );

    // カレンダーイベントの保存: 2秒以内
    this.defaultThresholds.set(
      'createWorkStateEvent',
      PerformanceThreshold.create('createWorkStateEvent', 2000, 50, 5)
    );

    // 保存済み仕事の一覧取得: 3秒以内
    this.defaultThresholds.set(
      'getWorkStateEvents',
      PerformanceThreshold.create('getWorkStateEvents', 3000, 50, 5)
    );

    // タブの復元（10個）: 5秒以内
    this.defaultThresholds.set(
      'restoreWorkState',
      PerformanceThreshold.create('restoreWorkState', 5000, 50, 5)
    );
  }

  /**
   * 操作をインターセプトしてパフォーマンスメトリクスを記録
   * @param operationName 操作名
   * @param operation 実行する操作
   * @returns 操作の結果
   */
  async intercept<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = this.metricsCollector.now();
    const startMemory = this.metricsCollector.getMemoryUsage();

    try {
      const result = await operation();
      return result;
    } finally {
      // メトリクスを非同期で記録（メインの操作に影響を与えない）
      this.recordMetricsAsync(operationName, startTime, startMemory);
    }
  }

  /**
   * メトリクスを非同期で記録
   * @param operationName 操作名
   * @param startTime 開始時間
   * @param startMemory 開始時のメモリ使用量
   */
  private async recordMetricsAsync(
    operationName: string,
    startTime: number,
    startMemory: number
  ): Promise<void> {
    try {
      const executionTimeMs = this.metricsCollector.elapsedTime(startTime);
      const endMemory = this.metricsCollector.getMemoryUsage();
      const memoryUsageMB = Math.max(0, endMemory - startMemory);
      const cpuUsagePercent = this.metricsCollector.getCpuUsage();

      const metric = PerformanceMetric.create(
        operationName,
        executionTimeMs,
        memoryUsageMB,
        cpuUsagePercent,
        new Date()
      );

      // メトリクスを保存
      await this.metricsRepository.save(metric);

      // プロファイルを更新
      const existingProfile =
        await this.metricsRepository.getProfile(operationName);
      const updatedProfile = this.monitoringService.updateProfile(
        existingProfile,
        metric
      );
      await this.metricsRepository.saveProfile(updatedProfile);

      // 閾値チェック
      const threshold = this.defaultThresholds.get(operationName);
      if (threshold && this.monitoringService.checkThreshold(metric, threshold)) {
        const event = this.monitoringService.createThresholdExceededEvent(
          metric,
          threshold
        );
        this.logger.warn(
          `Performance threshold exceeded for ${operationName}`,
          {
            eventId: event.eventId,
            exceededBy: event.exceededBy,
            executionTimeMs: metric.executionTimeMs,
            maxExecutionTimeMs: threshold.maxExecutionTimeMs,
          }
        );
      }
    } catch (error) {
      // メトリクス記録の失敗はログに記録するのみ（メインの操作に影響を与えない）
      this.logger.error(
        'Failed to record performance metrics',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * カスタム閾値を設定
   * @param operationName 操作名
   * @param threshold パフォーマンス閾値
   */
  setThreshold(operationName: string, threshold: PerformanceThreshold): void {
    this.defaultThresholds.set(operationName, threshold);
  }
}
