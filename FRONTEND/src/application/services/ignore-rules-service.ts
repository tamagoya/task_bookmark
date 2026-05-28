import { TabInfo } from '../../domain/value-objects/tab-info';
import { IgnoreRule } from '../../domain/value-objects/ignore-rule';
import { IgnoreRulesAggregate } from '../../domain/aggregates/ignore-rules';
import { IgnoreRulesRepository } from '../../domain/repositories/ignore-rules-repository';
import { IgnoreRuleFactory } from '../../domain/factories/ignore-rule-factory';
import { IgnorePattern } from '../../domain/value-objects/ignore-pattern';
import { IgnoreFlags } from '../../domain/value-objects/ignore-flags';
import { Logger } from '../../infrastructure/adapters/logger';

/**
 * IgnoreRulesService
 * 無視URLルールのCRUDとフィルタリングを担当するアプリケーションサービス
 *
 * フィルタリングAPIは Tab/URL リストを受け取り、対応するルール適用後の
 * 配列を返す純粋関数として設計（呼び出し側が結合しやすいように）。
 */
export class IgnoreRulesService {
  /** 集約のメモリキャッシュ（短時間の連続呼び出し最適化用） */
  private cached: IgnoreRulesAggregate | undefined;

  constructor(
    private readonly repository: IgnoreRulesRepository,
    private readonly logger: Logger = new Logger()
  ) {}

  /**
   * 集約を読み込み（キャッシュ優先）
   */
  async load(): Promise<IgnoreRulesAggregate> {
    if (this.cached) {
      return this.cached;
    }
    this.cached = await this.repository.load();
    return this.cached;
  }

  /**
   * 集約のキャッシュを破棄（外部からの設定変更通知に応答する用途）
   */
  invalidateCache(): void {
    this.cached = undefined;
  }

  /**
   * ルール一覧を取得
   */
  async listRules(): Promise<ReadonlyArray<IgnoreRule>> {
    const aggregate = await this.load();
    return aggregate.list();
  }

  /**
   * ルールを追加
   */
  async addRule(input: {
    pattern: string;
    ignoreOnSave: boolean;
    ignoreOnClose: boolean;
    ignoreOnRestore: boolean;
    label?: string;
    enabled?: boolean;
  }): Promise<IgnoreRule> {
    const rule = IgnoreRuleFactory.createNew(input);
    const aggregate = await this.load();
    const next = aggregate.add(rule);
    await this.repository.save(next);
    this.cached = next;
    this.logger.info(`Ignore rule added: id=${rule.id}, pattern=${rule.pattern.value}`);
    return rule;
  }

  /**
   * ルールを更新（部分更新）
   */
  async updateRule(
    id: string,
    patch: {
      pattern?: string;
      ignoreOnSave?: boolean;
      ignoreOnClose?: boolean;
      ignoreOnRestore?: boolean;
      label?: string;
      enabled?: boolean;
    }
  ): Promise<IgnoreRule> {
    const aggregate = await this.load();
    const now = new Date();
    const next = aggregate.update(id, (current) => {
      let updated = current;

      if (patch.pattern !== undefined) {
        updated = updated.withPattern(IgnorePattern.create(patch.pattern), now);
      }

      if (
        patch.ignoreOnSave !== undefined ||
        patch.ignoreOnClose !== undefined ||
        patch.ignoreOnRestore !== undefined
      ) {
        const flags = IgnoreFlags.create({
          ignoreOnSave: patch.ignoreOnSave ?? current.flags.ignoreOnSave,
          ignoreOnClose: patch.ignoreOnClose ?? current.flags.ignoreOnClose,
          ignoreOnRestore: patch.ignoreOnRestore ?? current.flags.ignoreOnRestore,
        });
        updated = updated.withFlags(flags, now);
      }

      if (patch.label !== undefined) {
        updated = updated.withLabel(patch.label, now);
      }

      if (patch.enabled !== undefined) {
        updated = updated.withEnabled(patch.enabled, now);
      }

      return updated;
    });

    await this.repository.save(next);
    this.cached = next;

    const updatedRule = next.find(id);
    if (!updatedRule) {
      throw new Error(`Ignore rule not found after update: ${id}`);
    }
    this.logger.info(`Ignore rule updated: id=${id}`);
    return updatedRule;
  }

  /**
   * ルールを削除
   */
  async removeRule(id: string): Promise<void> {
    const aggregate = await this.load();
    const next = aggregate.remove(id);
    await this.repository.save(next);
    this.cached = next;
    this.logger.info(`Ignore rule removed: id=${id}`);
  }

  /**
   * ルールの有効/無効を切替
   */
  async setEnabled(id: string, enabled: boolean): Promise<IgnoreRule> {
    const aggregate = await this.load();
    const next = aggregate.setEnabled(id, enabled, new Date());
    await this.repository.save(next);
    this.cached = next;
    const updated = next.find(id);
    if (!updated) {
      throw new Error(`Ignore rule not found after setEnabled: ${id}`);
    }
    return updated;
  }

  /**
   * 「保存無視」に該当しないタブを返す（Unit-2: 保存対象から除外）
   */
  async filterTabsForSave(tabs: ReadonlyArray<TabInfo>): Promise<TabInfo[]> {
    if (tabs.length === 0) {
      return [];
    }
    const aggregate = await this.load();
    if (aggregate.size() === 0) {
      return [...tabs];
    }
    return tabs.filter((tab) => !aggregate.isIgnoredOnSave(tab.url));
  }

  /**
   * 「閉じる無視」に該当しないタブIDを返す（Unit-2: 保存後に閉じない）
   * 入力は url-tabId のペア配列。アクセス可能なタブの一部だけを「閉じる対象」にする用途。
   */
  async filterTabIdsForClose(
    tabs: ReadonlyArray<{ tabId: number; url: string }>
  ): Promise<number[]> {
    if (tabs.length === 0) {
      return [];
    }
    const aggregate = await this.load();
    if (aggregate.size() === 0) {
      return tabs.map((t) => t.tabId);
    }
    return tabs
      .filter((t) => !aggregate.isIgnoredOnClose(t.url))
      .map((t) => t.tabId);
  }

  /**
   * 「復元無視」に該当しないタブを返す（Unit-4: 復元時に開かない）
   */
  async filterTabsForRestore(
    tabs: ReadonlyArray<TabInfo>
  ): Promise<TabInfo[]> {
    if (tabs.length === 0) {
      return [];
    }
    const aggregate = await this.load();
    if (aggregate.size() === 0) {
      return [...tabs];
    }
    return tabs.filter((tab) => !aggregate.isIgnoredOnRestore(tab.url));
  }
}
