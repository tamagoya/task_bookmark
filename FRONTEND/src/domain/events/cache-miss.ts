/**
 * CacheMiss Domain Event
 * キャッシュミスが発生した時に発行されるイベント
 */
export class CacheMiss {
  constructor(
    public readonly eventId: string,
    public readonly cacheKey: string,
    public readonly missedAt: Date
  ) {}

  /**
   * CacheMissを作成
   * @param cacheKey キャッシュキー
   * @returns CacheMissインスタンス
   */
  static create(cacheKey: string): CacheMiss {
    // 一意のイベントIDを生成（簡易実装: タイムスタンプ + ランダム文字列）
    const eventId = `cache-miss-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    return new CacheMiss(eventId, cacheKey, new Date());
  }
}
