import { IgnoreRulesAggregate } from '../aggregates/ignore-rules';

/**
 * IgnoreRulesRepository Interface
 * 無視URLルール集約の永続化を担当する Repository インターフェース
 *
 * 実装は ChromeStorageIgnoreRulesRepository（ADR-031: chrome.storage.local）。
 */
export interface IgnoreRulesRepository {
  /**
   * 集約全体を取得（未保存時は空集約）
   */
  load(): Promise<IgnoreRulesAggregate>;

  /**
   * 集約全体を保存（全置き換え）
   */
  save(aggregate: IgnoreRulesAggregate): Promise<void>;

  /**
   * 集約全体を削除（リセット）
   */
  clear(): Promise<void>;
}
