/**
 * CacheHit Domain Event
 * キャッシュヒットが発生した時に発行されるイベント
 */
export class CacheHit {
  constructor(
    public readonly eventId: string,
    public readonly cacheKey: string,
    public readonly hitAt: Date
  ) {}

  /**
   * CacheHitを作成
   * @param cacheKey キャッシュキー
   * @returns CacheHitインスタンス
   */
  static create(cacheKey: string): CacheHit {
    // 一意のイベントIDを生成（簡易実装: タイムスタンプ + ランダム文字列）
    const eventId = `cache-hit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    return new CacheHit(eventId, cacheKey, new Date());
  }
}
