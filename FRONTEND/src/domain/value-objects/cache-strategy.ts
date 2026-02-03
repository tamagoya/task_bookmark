/**
 * CacheStrategy Value Object
 * キャッシュ戦略を表す不変オブジェクト
 */
export class CacheStrategy {
  private constructor(
    private readonly _cacheKey: string,
    private readonly _ttlSeconds: number,
    private readonly _maxSize: number,
    private readonly _evictionPolicy: 'LRU' | 'FIFO' | 'LFU'
  ) {
    if (!_cacheKey || _cacheKey.trim().length === 0) {
      throw new Error('Cache key cannot be empty');
    }
    if (_ttlSeconds <= 0) {
      throw new Error('TTL must be positive');
    }
    if (_maxSize <= 0) {
      throw new Error('Max size must be positive');
    }
  }

  /**
   * CacheStrategyを作成
   * @param cacheKey キャッシュキー
   * @param ttlSeconds Time To Live（秒）
   * @param maxSize 最大キャッシュサイズ（アイテム数）
   * @param evictionPolicy エビクションポリシー
   * @returns CacheStrategyインスタンス
   */
  static create(
    cacheKey: string,
    ttlSeconds: number,
    maxSize: number,
    evictionPolicy: 'LRU' | 'FIFO' | 'LFU'
  ): CacheStrategy {
    return new CacheStrategy(cacheKey, ttlSeconds, maxSize, evictionPolicy);
  }

  /**
   * キャッシュキーを取得
   */
  get cacheKey(): string {
    return this._cacheKey;
  }

  /**
   * Time To Live（秒）を取得
   */
  get ttlSeconds(): number {
    return this._ttlSeconds;
  }

  /**
   * 最大キャッシュサイズ（アイテム数）を取得
   */
  get maxSize(): number {
    return this._maxSize;
  }

  /**
   * エビクションポリシーを取得
   */
  get evictionPolicy(): 'LRU' | 'FIFO' | 'LFU' {
    return this._evictionPolicy;
  }

  /**
   * 等価性チェック
   * @param other 比較対象のCacheStrategy
   * @returns 等しい場合true
   */
  equals(other: CacheStrategy): boolean {
    if (!other) {
      return false;
    }
    return (
      this._cacheKey === other._cacheKey &&
      this._ttlSeconds === other._ttlSeconds &&
      this._maxSize === other._maxSize &&
      this._evictionPolicy === other._evictionPolicy
    );
  }
}
