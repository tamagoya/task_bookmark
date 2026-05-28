import { IgnoreRule } from '../value-objects/ignore-rule';
import { IgnorePattern } from '../value-objects/ignore-pattern';
import { IgnoreFlags } from '../value-objects/ignore-flags';

/**
 * IgnoreRulesAggregate (Aggregate Root)
 * 無視URLルールの集合を表す Aggregate Root。
 * 重複検出・上限管理・判定APIを提供する。
 *
 * 不変条件:
 * 1. ルール総数 <= MAX_RULES（100件、ADR-032 / NFR-1.3）
 * 2. 同一 pattern.value のルールは集合内に1件のみ
 * 3. 各 IgnoreRule の flags は少なくとも1つが true（IgnoreFlags 自体が保証）
 */
export class IgnoreRulesAggregate {
  static readonly MAX_RULES = 100;
  static readonly SCHEMA_VERSION = 1;

  private constructor(private readonly _rules: ReadonlyArray<IgnoreRule>) {}

  /**
   * 空の集約を作成
   */
  static empty(): IgnoreRulesAggregate {
    return new IgnoreRulesAggregate([]);
  }

  /**
   * ルール配列から集約を作成（読み込み時用）
   * 不変条件をチェックし、違反時は例外を投げる
   */
  static fromRules(rules: ReadonlyArray<IgnoreRule>): IgnoreRulesAggregate {
    if (rules.length > IgnoreRulesAggregate.MAX_RULES) {
      throw new Error(
        `IgnoreRulesAggregate cannot contain more than ${IgnoreRulesAggregate.MAX_RULES} rules`
      );
    }

    // 重複チェック
    const seen = new Set<string>();
    for (const rule of rules) {
      if (seen.has(rule.pattern.value)) {
        throw new Error(
          `IgnoreRulesAggregate contains duplicate pattern: ${rule.pattern.value}`
        );
      }
      seen.add(rule.pattern.value);
    }

    return new IgnoreRulesAggregate([...rules]);
  }

  /**
   * ルール一覧（不変なコピー）
   */
  list(): ReadonlyArray<IgnoreRule> {
    return this._rules;
  }

  /**
   * ルール件数
   */
  size(): number {
    return this._rules.length;
  }

  /**
   * ID でルールを検索
   */
  find(id: string): IgnoreRule | undefined {
    return this._rules.find((r) => r.id === id);
  }

  /**
   * ルールを追加（重複・上限チェック後、新インスタンスを返す）
   * @throws 重複エラー、上限超過エラー
   */
  add(rule: IgnoreRule): IgnoreRulesAggregate {
    if (this._rules.length >= IgnoreRulesAggregate.MAX_RULES) {
      throw new Error(
        `Cannot add ignore rule: limit of ${IgnoreRulesAggregate.MAX_RULES} rules reached`
      );
    }

    if (this._rules.some((r) => r.pattern.value === rule.pattern.value)) {
      throw new Error(
        `Cannot add ignore rule: pattern "${rule.pattern.value}" already exists`
      );
    }

    if (this._rules.some((r) => r.id === rule.id)) {
      throw new Error(
        `Cannot add ignore rule: id "${rule.id}" already exists`
      );
    }

    return new IgnoreRulesAggregate([...this._rules, rule]);
  }

  /**
   * ルールを更新（ID指定、updater 関数で新IgnoreRuleを返す）
   * @throws 該当ID無し、重複（pattern変更時）エラー
   */
  update(
    id: string,
    updater: (current: IgnoreRule) => IgnoreRule
  ): IgnoreRulesAggregate {
    const index = this._rules.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new Error(`Ignore rule not found: ${id}`);
    }

    const current = this._rules[index];
    const updated = updater(current);

    if (updated.id !== id) {
      throw new Error('IgnoreRule id cannot be changed');
    }

    // pattern 重複チェック（自身を除く）
    const duplicate = this._rules.some(
      (r) => r.id !== id && r.pattern.value === updated.pattern.value
    );
    if (duplicate) {
      throw new Error(
        `Cannot update ignore rule: pattern "${updated.pattern.value}" already exists`
      );
    }

    const next = [...this._rules];
    next[index] = updated;
    return new IgnoreRulesAggregate(next);
  }

  /**
   * ルールを削除（該当ID無しは無視）
   */
  remove(id: string): IgnoreRulesAggregate {
    const filtered = this._rules.filter((r) => r.id !== id);
    if (filtered.length === this._rules.length) {
      return this;
    }
    return new IgnoreRulesAggregate(filtered);
  }

  /**
   * 有効/無効を切り替え（変化が無ければ this を返す）
   */
  setEnabled(id: string, enabled: boolean, now: Date): IgnoreRulesAggregate {
    const current = this.find(id);
    if (!current) {
      throw new Error(`Ignore rule not found: ${id}`);
    }
    if (current.enabled === enabled) {
      return this;
    }
    return this.update(id, (r) => r.withEnabled(enabled, now));
  }

  /**
   * URLが「保存無視」に該当するルール（最初に一致したもの）を返す
   */
  findIgnoredOnSave(url: string): IgnoreRule | undefined {
    return this._rules.find((r) => r.appliesOnSave(url));
  }

  /**
   * URLが「閉じる無視」に該当するルール（最初に一致したもの）を返す
   */
  findIgnoredOnClose(url: string): IgnoreRule | undefined {
    return this._rules.find((r) => r.appliesOnClose(url));
  }

  /**
   * URLが「復元無視」に該当するルール（最初に一致したもの）を返す
   */
  findIgnoredOnRestore(url: string): IgnoreRule | undefined {
    return this._rules.find((r) => r.appliesOnRestore(url));
  }

  /**
   * URLが「保存無視」に該当するか
   */
  isIgnoredOnSave(url: string): boolean {
    return this.findIgnoredOnSave(url) !== undefined;
  }

  /**
   * URLが「閉じる無視」に該当するか
   */
  isIgnoredOnClose(url: string): boolean {
    return this.findIgnoredOnClose(url) !== undefined;
  }

  /**
   * URLが「復元無視」に該当するか
   */
  isIgnoredOnRestore(url: string): boolean {
    return this.findIgnoredOnRestore(url) !== undefined;
  }
}

// 重複検出のために再エクスポート（テスト用途）
export { IgnoreRule, IgnorePattern, IgnoreFlags };
