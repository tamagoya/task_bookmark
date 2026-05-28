import { IgnorePattern } from './ignore-pattern';
import { IgnoreFlags } from './ignore-flags';

/**
 * IgnoreRule Value Object
 * 1件の無視URLルールを表す不変オブジェクト
 *
 * pattern（URL部分一致）と3つの独立した無視フラグの組合せで、
 * 保存・閉じ・復元の各タイミングでURLを除外できる。
 */
export class IgnoreRule {
  static readonly MAX_LABEL_LENGTH = 100;

  private constructor(
    public readonly id: string,
    public readonly pattern: IgnorePattern,
    public readonly flags: IgnoreFlags,
    public readonly label: string | undefined,
    public readonly enabled: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  /**
   * IgnoreRuleを作成
   * @throws バリデーションエラー
   */
  static create(data: {
    id: string;
    pattern: IgnorePattern;
    flags: IgnoreFlags;
    label?: string;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): IgnoreRule {
    if (!data.id || typeof data.id !== 'string' || data.id.trim().length === 0) {
      throw new Error('IgnoreRule id cannot be empty');
    }

    if (typeof data.enabled !== 'boolean') {
      throw new Error('IgnoreRule enabled must be a boolean');
    }

    if (!(data.createdAt instanceof Date) || Number.isNaN(data.createdAt.getTime())) {
      throw new Error('IgnoreRule createdAt must be a valid Date');
    }

    if (!(data.updatedAt instanceof Date) || Number.isNaN(data.updatedAt.getTime())) {
      throw new Error('IgnoreRule updatedAt must be a valid Date');
    }

    let normalizedLabel: string | undefined;
    if (data.label !== undefined) {
      if (typeof data.label !== 'string') {
        throw new Error('IgnoreRule label must be a string');
      }
      const trimmed = data.label.trim();
      if (trimmed.length > IgnoreRule.MAX_LABEL_LENGTH) {
        throw new Error(
          `IgnoreRule label must be at most ${IgnoreRule.MAX_LABEL_LENGTH} characters`
        );
      }
      normalizedLabel = trimmed.length === 0 ? undefined : trimmed;
    }

    return new IgnoreRule(
      data.id,
      data.pattern,
      data.flags,
      normalizedLabel,
      data.enabled,
      data.createdAt,
      data.updatedAt
    );
  }

  /**
   * URLがこのルールに該当するか（enabled かつ pattern 一致）
   */
  matches(url: string): boolean {
    return this.enabled && this.pattern.matches(url);
  }

  /**
   * 保存無視として作用するか
   */
  appliesOnSave(url: string): boolean {
    return this.matches(url) && this.flags.ignoreOnSave;
  }

  /**
   * 閉じる無視として作用するか
   */
  appliesOnClose(url: string): boolean {
    return this.matches(url) && this.flags.ignoreOnClose;
  }

  /**
   * 復元無視として作用するか
   */
  appliesOnRestore(url: string): boolean {
    return this.matches(url) && this.flags.ignoreOnRestore;
  }

  /**
   * pattern を変更した新しいインスタンスを返す
   */
  withPattern(pattern: IgnorePattern, now: Date): IgnoreRule {
    return new IgnoreRule(
      this.id,
      pattern,
      this.flags,
      this.label,
      this.enabled,
      this.createdAt,
      now
    );
  }

  /**
   * flags を変更した新しいインスタンスを返す
   */
  withFlags(flags: IgnoreFlags, now: Date): IgnoreRule {
    return new IgnoreRule(
      this.id,
      this.pattern,
      flags,
      this.label,
      this.enabled,
      this.createdAt,
      now
    );
  }

  /**
   * label を変更した新しいインスタンスを返す
   */
  withLabel(label: string | undefined, now: Date): IgnoreRule {
    let normalizedLabel: string | undefined;
    if (label !== undefined) {
      if (typeof label !== 'string') {
        throw new Error('IgnoreRule label must be a string');
      }
      const trimmed = label.trim();
      if (trimmed.length > IgnoreRule.MAX_LABEL_LENGTH) {
        throw new Error(
          `IgnoreRule label must be at most ${IgnoreRule.MAX_LABEL_LENGTH} characters`
        );
      }
      normalizedLabel = trimmed.length === 0 ? undefined : trimmed;
    }
    return new IgnoreRule(
      this.id,
      this.pattern,
      this.flags,
      normalizedLabel,
      this.enabled,
      this.createdAt,
      now
    );
  }

  /**
   * enabled を変更した新しいインスタンスを返す
   */
  withEnabled(enabled: boolean, now: Date): IgnoreRule {
    if (typeof enabled !== 'boolean') {
      throw new Error('IgnoreRule enabled must be a boolean');
    }
    return new IgnoreRule(
      this.id,
      this.pattern,
      this.flags,
      this.label,
      enabled,
      this.createdAt,
      now
    );
  }

  /**
   * 等価性チェック（id ベース）
   */
  equals(other: IgnoreRule | undefined | null): boolean {
    if (!other) {
      return false;
    }
    return (
      this.id === other.id &&
      this.pattern.equals(other.pattern) &&
      this.flags.equals(other.flags) &&
      this.label === other.label &&
      this.enabled === other.enabled &&
      this.createdAt.getTime() === other.createdAt.getTime() &&
      this.updatedAt.getTime() === other.updatedAt.getTime()
    );
  }
}
