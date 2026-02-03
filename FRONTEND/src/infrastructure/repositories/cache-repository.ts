/**
 * CacheRepository インターフェース
 * キャッシュの永続化を担当
 */
export interface CacheRepository {
  /**
   * キャッシュから値を取得
   * @param key キャッシュキー
   * @returns キャッシュされた値（存在しない場合はnull）
   */
  get<T>(key: string): Promise<CacheEntry<T> | null>;

  /**
   * キャッシュに値を保存
   * @param key キャッシュキー
   * @param value 保存する値
   * @param ttlSeconds Time To Live（秒）
   */
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;

  /**
   * キャッシュから値を削除
   * @param key キャッシュキー
   */
  delete(key: string): Promise<void>;

  /**
   * すべてのキャッシュをクリア
   */
  clear(): Promise<void>;

  /**
   * キャッシュのサイズを取得
   * @returns キャッシュのエントリ数
   */
  size(): Promise<number>;
}

/**
 * CacheEntry
 * キャッシュエントリを表す
 */
export interface CacheEntry<T> {
  value: T;
  cachedAt: Date;
  ttlSeconds: number;
}
