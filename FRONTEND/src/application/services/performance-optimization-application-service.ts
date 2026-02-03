import { CacheStrategy } from '../../domain/value-objects/cache-strategy';
import { BatchSize } from '../../domain/value-objects/batch-size';
import { PerformanceOptimizationService as DomainOptimizationService } from '../../domain/services/performance-optimization-service';
import { PerformanceMetricsRepository } from '../../infrastructure/repositories/performance-metrics-repository';
import { Logger } from '../../infrastructure/adapters/logger';

/**
 * PerformanceOptimizationApplicationService
 * パフォーマンス最適化を担当するアプリケーションサービス
 * Domain ServiceとInfrastructure層を統合
 */
export class PerformanceOptimizationApplicationService {
  constructor(
    private readonly domainService: DomainOptimizationService,
    private readonly metricsRepository: PerformanceMetricsRepository,
    private readonly logger: Logger
  ) {}

  /**
   * キャッシュ戦略を最適化
   * @param operationName 操作名
   * @returns 最適化されたキャッシュ戦略
   */
  async optimizeCacheStrategy(operationName: string): Promise<CacheStrategy> {
    const profile = await this.metricsRepository.getProfile(operationName);
    const strategy = this.domainService.optimizeCacheStrategy(
      operationName,
      profile
    );

    this.logger.debug(`Cache strategy optimized for ${operationName}`, {
      ttlSeconds: strategy.ttlSeconds,
      maxSize: strategy.maxSize,
      evictionPolicy: strategy.evictionPolicy,
    });

    return strategy;
  }

  /**
   * バッチサイズを最適化
   * @param operationName 操作名
   * @param currentSize 現在のバッチサイズ
   * @returns 最適化されたバッチサイズ
   */
  async optimizeBatchSize(
    operationName: string,
    currentSize: number
  ): Promise<BatchSize> {
    const profile = await this.metricsRepository.getProfile(operationName);
    const batchSize = this.domainService.optimizeBatchSize(
      operationName,
      currentSize,
      profile
    );

    this.logger.debug(`Batch size optimized for ${operationName}`, {
      size: batchSize.size,
      delayMs: batchSize.delayMs,
    });

    return batchSize;
  }

  /**
   * キャッシュを使用すべきか判定
   * @param operationName 操作名
   * @returns キャッシュを使用すべき場合true
   */
  async shouldUseCache(operationName: string): Promise<boolean> {
    const profile = await this.metricsRepository.getProfile(operationName);
    return this.domainService.shouldUseCache(operationName, profile);
  }
}
