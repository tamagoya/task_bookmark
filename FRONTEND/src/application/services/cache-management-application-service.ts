import { CacheStrategy } from '../../domain/value-objects/cache-strategy';
import { CacheManagementService as DomainCacheService } from '../../domain/services/cache-management-service';
import { CacheRepository } from '../../infrastructure/repositories/cache-repository';
import { Logger } from '../../infrastructure/adapters/logger';

/**
 * CacheManagementApplicationService
 * キャッシュ管理を担当するアプリケーションサービス
 * Domain ServiceとInfrastructure層を統合
 */
export class CacheManagementApplicationService {
  constructor(
    private readonly domainService: DomainCacheService,
    private readonly cacheRepository: CacheRepository,
    private readonly logger: Logger
  ) {}

  /**
   * キャッシュから値を取得
   * @param operationName 操作名
   * @param params パラメータ
   * @returns キャッシュされた値（存在しない場合はnull）
   */
  async get<T>(
    operationName: string,
    params: Record<string, unknown>
  ): Promise<T | null> {
    const cacheKey = this.domainService.getCacheKey(operationName, params);

    try {
      const entry = await this.cacheRepository.get<T>(cacheKey);

      if (entry) {
        this.domainService.createCacheHitEvent(cacheKey);
        this.logger.debug(`Cache hit for ${operationName}`, { cacheKey });
        return entry.value;
      }

      this.domainService.createCacheMissEvent(cacheKey);
      this.logger.debug(`Cache miss for ${operationName}`, { cacheKey });
      return null;
    } catch (error) {
      this.logger.error(
        `Failed to get from cache for ${operationName}`,
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }
  }

  /**
   * キャッシュに値を保存
   * @param operationName 操作名
   * @param params パラメータ
   * @param value 保存する値
   * @param strategy キャッシュ戦略
   */
  async set<T>(
    operationName: string,
    params: Record<string, unknown>,
    value: T,
    strategy: CacheStrategy
  ): Promise<void> {
    const cacheKey = this.domainService.getCacheKey(operationName, params);

    try {
      await this.cacheRepository.set(cacheKey, value, strategy.ttlSeconds);
      this.logger.debug(`Cache set for ${operationName}`, {
        cacheKey,
        ttlSeconds: strategy.ttlSeconds,
      });
    } catch (error) {
      this.logger.error(
        `Failed to set cache for ${operationName}`,
        error instanceof Error ? error : new Error(String(error))
      );
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
    const cacheKey = this.domainService.getCacheKey(operationName, params);

    try {
      await this.cacheRepository.delete(cacheKey);
      this.logger.debug(`Cache invalidated for ${operationName}`, { cacheKey });
    } catch (error) {
      this.logger.error(
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
      this.logger.error(
        'Failed to clear all cache',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * キャッシュサイズを取得
   * @returns キャッシュのエントリ数
   */
  async getCacheSize(): Promise<number> {
    return await this.cacheRepository.size();
  }
}
