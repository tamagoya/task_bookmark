import { CacheStrategy } from '../../domain/value-objects/cache-strategy';
import { CacheManagementService as DomainCacheService } from '../../domain/services/cache-management-service';
import { CacheRepository } from '../../infrastructure/repositories/cache-repository';
import { Logger } from '../../infrastructure/adapters/logger';

/**
 * CacheDecorator
 * 既存のサービスメソッドにキャッシュ機能を追加するデコレーター
 * Cache-Aside パターンを実装
 */
export class CacheDecorator {
  constructor(
    private readonly cacheService: DomainCacheService,
    private readonly cacheRepository: CacheRepository,
    private readonly logger: Logger
  ) {}

  /**
   * 操作をキャッシュでラップ
   * @param operationName 操作名
   * @param params パラメータ
   * @param operation 実行する操作
   * @param strategy キャッシュ戦略
   * @returns 操作の結果（キャッシュまたは実行結果）
   */
  async withCache<T>(
    operationName: string,
    params: Record<string, unknown>,
    operation: () => Promise<T>,
    strategy: CacheStrategy
  ): Promise<T> {
    const cacheKey = this.cacheService.getCacheKey(operationName, params);

    try {
      // キャッシュから取得を試みる
      const cached = await this.cacheRepository.get<T>(cacheKey);

      if (cached) {
        // TTLチェック
        if (
          !this.cacheService.shouldInvalidateCache(
            cacheKey,
            strategy,
            cached.cachedAt
          )
        ) {
          // キャッシュヒット
          this.cacheService.createCacheHitEvent(cacheKey);
          this.logger.debug(`Cache hit for ${operationName}`, { cacheKey });
          return cached.value;
        }
      }

      // キャッシュミス: 操作を実行
      this.cacheService.createCacheMissEvent(cacheKey);
      this.logger.debug(`Cache miss for ${operationName}`, { cacheKey });

      const result = await operation();

      // キャッシュに保存
      await this.cacheRepository.set(cacheKey, result, strategy.ttlSeconds);

      return result;
    } catch (error) {
      // キャッシュエラーの場合、操作を直接実行（グレースフルデグラデーション）
      this.logger.warn(
        `Cache operation failed for ${operationName}, executing operation directly`,
        error instanceof Error ? error : new Error(String(error))
      );

      return await operation();
    }
  }

  /**
   * キャッシュを無効化
   * @param operationName 操作名
   * @param params パラメータ
   */
  async invalidate(
    operationName: string,
    params: Record<string, unknown>
  ): Promise<void> {
    const cacheKey = this.cacheService.getCacheKey(operationName, params);

    try {
      await this.cacheRepository.delete(cacheKey);
      this.logger.debug(`Cache invalidated for ${operationName}`, { cacheKey });
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate cache for ${operationName}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * すべてのキャッシュをクリア
   */
  async clearAll(): Promise<void> {
    try {
      await this.cacheRepository.clear();
      this.logger.debug('All cache cleared');
    } catch (error) {
      this.logger.warn(
        'Failed to clear all cache',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}
