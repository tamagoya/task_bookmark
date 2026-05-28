import { IgnoreRule } from '../value-objects/ignore-rule';
import { IgnorePattern } from '../value-objects/ignore-pattern';
import { IgnoreFlags } from '../value-objects/ignore-flags';

/**
 * IgnoreRuleFactory
 * IgnoreRule の生成を担当する Factory
 *
 * - id 生成（crypto.randomUUID() を優先、無い環境ではフォールバック）
 * - createdAt / updatedAt の付与
 * - 入力値の正規化
 */
export class IgnoreRuleFactory {
  /**
   * 新規 IgnoreRule を作成（id・タイムスタンプ自動付与）
   */
  static createNew(input: {
    pattern: string;
    ignoreOnSave: boolean;
    ignoreOnClose: boolean;
    ignoreOnRestore: boolean;
    label?: string;
    enabled?: boolean;
    now?: Date;
  }): IgnoreRule {
    const pattern = IgnorePattern.create(input.pattern);
    const flags = IgnoreFlags.create({
      ignoreOnSave: input.ignoreOnSave,
      ignoreOnClose: input.ignoreOnClose,
      ignoreOnRestore: input.ignoreOnRestore,
    });
    const now = input.now ?? new Date();

    return IgnoreRule.create({
      id: IgnoreRuleFactory.generateId(),
      pattern,
      flags,
      label: input.label,
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * 永続化された生データから IgnoreRule を再構築する
   */
  static fromPersisted(input: {
    id: string;
    pattern: string;
    ignoreOnSave: boolean;
    ignoreOnClose: boolean;
    ignoreOnRestore: boolean;
    label?: string;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
  }): IgnoreRule {
    const pattern = IgnorePattern.create(input.pattern);
    const flags = IgnoreFlags.create({
      ignoreOnSave: input.ignoreOnSave,
      ignoreOnClose: input.ignoreOnClose,
      ignoreOnRestore: input.ignoreOnRestore,
    });

    const createdAt = new Date(input.createdAt);
    const updatedAt = new Date(input.updatedAt);

    return IgnoreRule.create({
      id: input.id,
      pattern,
      flags,
      label: input.label,
      enabled: input.enabled,
      createdAt,
      updatedAt,
    });
  }

  /**
   * UUID 風の ID を生成
   * crypto.randomUUID が使用可能ならそれを利用、無い場合は時刻+乱数で代替
   */
  static generateId(): string {
    const c = (
      globalThis as { crypto?: { randomUUID?: () => string } }
    ).crypto;
    if (c && typeof c.randomUUID === 'function') {
      return c.randomUUID();
    }
    const ts = Date.now().toString(36);
    const rnd1 = Math.random().toString(36).slice(2, 10);
    const rnd2 = Math.random().toString(36).slice(2, 10);
    return `irule-${ts}-${rnd1}${rnd2}`;
  }
}
