import { CacheStrategy } from '../value-objects/cache-strategy';
import { CacheHit } from '../events/cache-hit';
import { CacheMiss } from '../events/cache-miss';

/**
 * CacheManagementService (Domain Service)
 * キャッシュ管理を担当するDomain Service
 * 純粋なビジネスロジックを提供（Repositoryへの依存なし）
 */
export class CacheManagementService {
  /**
   * キャッシュキーを生成
   * @param operationName 操作名
   * @param params パラメータ
   * @returns キャッシュキー
   */
  getCacheKey(
    operationName: string,
    params: Record<string, unknown>
  ): string {
    // パラメータをソートして一意のキーを生成
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${JSON.stringify(params[key])}`)
      .join('|');

    return `${operationName}:${sortedParams}`;
  }

  /**
   * キャッシュを無効化すべきか判定
   * @param cacheKey キャッシュキー
   * @param strategy キャッシュ戦略
   * @param cachedAt キャッシュされた日時（オプション）
   * @returns 無効化すべき場合true
   */
  shouldInvalidateCache(
    _cacheKey: string,
    strategy: CacheStrategy,
    cachedAt?: Date
  ): boolean {
    // cacheKeyは将来の拡張用に保持（キー固有の無効化ロジックなど）
    void _cacheKey;
    if (!cachedAt) {
      return false;
    }

    const now = new Date();
    const elapsedSeconds = (now.getTime() - cachedAt.getTime()) / 1000;

    return elapsedSeconds >= strategy.ttlSeconds;
  }

  /**
   * キャッシュヒットイベントを作成
   * @param cacheKey キャッシュキー
   * @returns CacheHitイベント
   */
  createCacheHitEvent(cacheKey: string): CacheHit {
    return CacheHit.create(cacheKey);
  }

  /**
   * キャッシュミスイベントを作成
   * @param cacheKey キャッシュキー
   * @returns CacheMissイベント
   */
  createCacheMissEvent(cacheKey: string): CacheMiss {
    return CacheMiss.create(cacheKey);
  }
}
