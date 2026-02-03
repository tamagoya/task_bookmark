import { CacheRepository, CacheEntry } from './cache-repository';

/**
 * InMemoryCacheRepository
 * メモリ内でキャッシュを管理するリポジトリ実装
 * LRU（Least Recently Used）エビクションポリシーを採用
 */
export class InMemoryCacheRepository implements CacheRepository {
  private readonly cache: Map<string, CacheEntry<unknown>> = new Map();
  private readonly maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  /**
   * キャッシュから値を取得
   * @param key キャッシュキー
   * @returns キャッシュされた値（存在しない場合はnull）
   */
  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // TTLチェック
    const now = new Date();
    const elapsedSeconds =
      (now.getTime() - entry.cachedAt.getTime()) / 1000;

    if (elapsedSeconds >= entry.ttlSeconds) {
      // TTL切れ: エントリを削除
      this.cache.delete(key);
      return null;
    }

    // LRU: アクセスされたエントリを末尾に移動
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry as CacheEntry<T>;
  }

  /**
   * キャッシュに値を保存
   * @param key キャッシュキー
   * @param value 保存する値
   * @param ttlSeconds Time To Live（秒）
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    // LRU: 最大サイズを超えた場合、最も古いエントリを削除
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    const entry: CacheEntry<T> = {
      value,
      cachedAt: new Date(),
      ttlSeconds,
    };

    this.cache.set(key, entry);
  }

  /**
   * キャッシュから値を削除
   * @param key キャッシュキー
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /**
   * すべてのキャッシュをクリア
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * キャッシュのサイズを取得
   * @returns キャッシュのエントリ数
   */
  async size(): Promise<number> {
    return this.cache.size;
  }
}
