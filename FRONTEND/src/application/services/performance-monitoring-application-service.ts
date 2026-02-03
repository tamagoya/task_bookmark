import { PerformanceMetric } from '../../domain/value-objects/performance-metric';
import { PerformanceThreshold } from '../../domain/value-objects/performance-threshold';
import { PerformanceProfile } from '../../domain/value-objects/performance-profile';
import { PerformanceMonitoringService as DomainMonitoringService } from '../../domain/services/performance-monitoring-service';
import { PerformanceMetricsRepository } from '../../infrastructure/repositories/performance-metrics-repository';
import { PerformanceMetricsCollector } from '../../infrastructure/adapters/performance-metrics-collector';
import { Logger } from '../../infrastructure/adapters/logger';

/**
 * PerformanceMonitoringApplicationService
 * パフォーマンス監視を担当するアプリケーションサービス
 * Domain ServiceとInfrastructure層を統合
 */
export class PerformanceMonitoringApplicationService {
  constructor(
    private readonly domainService: DomainMonitoringService,
    private readonly metricsRepository: PerformanceMetricsRepository,
    private readonly metricsCollector: PerformanceMetricsCollector,
    private readonly logger: Logger
  ) {}

  /**
   * パフォーマンスメトリクスを記録
   * @param operationName 操作名
   * @param executionTimeMs 実行時間（ミリ秒）
   * @param memoryUsageMB メモリ使用量（MB）
   * @param cpuUsagePercent CPU使用率（%）
   */
  async recordMetric(
    operationName: string,
    executionTimeMs: number,
    memoryUsageMB: number,
    cpuUsagePercent: number
  ): Promise<void> {
    try {
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
      const updatedProfile = this.domainService.updateProfile(
        existingProfile,
        metric
      );
      await this.metricsRepository.saveProfile(updatedProfile);

      this.logger.debug(`Performance metric recorded for ${operationName}`, {
        executionTimeMs,
        memoryUsageMB,
        cpuUsagePercent,
      });
    } catch (error) {
      this.logger.error(
        `Failed to record metric for ${operationName}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * パフォーマンス閾値をチェック
   * @param operationName 操作名
   * @param metric パフォーマンスメトリクス
   * @returns 閾値を超えた場合true
   */
  async checkThreshold(
    operationName: string,
    metric: PerformanceMetric,
    threshold: PerformanceThreshold
  ): Promise<boolean> {
    const exceeded = this.domainService.checkThreshold(metric, threshold);

    if (exceeded) {
      const event = this.domainService.createThresholdExceededEvent(
        metric,
        threshold
      );
      this.logger.warn(`Performance threshold exceeded for ${operationName}`, {
        eventId: event.eventId,
        exceededBy: event.exceededBy,
      });
    }

    return exceeded;
  }

  /**
   * パフォーマンスプロファイルを取得
   * @param operationName 操作名
   * @returns プロファイル（存在しない場合はnull）
   */
  async getProfile(operationName: string): Promise<PerformanceProfile | null> {
    return await this.metricsRepository.getProfile(operationName);
  }

  /**
   * 現在のメモリ使用量を取得
   * @returns メモリ使用量（MB）
   */
  getCurrentMemoryUsage(): number {
    return this.metricsCollector.getMemoryUsage();
  }

  /**
   * 現在のCPU使用率を取得
   * @returns CPU使用率（%）
   */
  getCurrentCpuUsage(): number {
    return this.metricsCollector.getCpuUsage();
  }
}
