/**
 * IgnorePattern Value Object
 * 無視URLルールのURLパターン（部分一致）を表す不変オブジェクト
 *
 * マッチ方式は ADR-030 により substring（URL中の部分一致）一本化。
 */
export class IgnorePattern {
  static readonly MAX_LENGTH = 2048;

  private constructor(public readonly value: string) {}

  /**
   * IgnorePatternを作成
   * @param raw 入力文字列（前後の空白はトリムされる）
   * @returns IgnorePatternインスタンス
   * @throws バリデーションエラー
   */
  static create(raw: string): IgnorePattern {
    if (typeof raw !== 'string') {
      throw new Error('IgnorePattern value must be a string');
    }

    const trimmed = raw.trim();

    if (trimmed.length === 0) {
      throw new Error('IgnorePattern value cannot be empty');
    }

    if (trimmed.length > IgnorePattern.MAX_LENGTH) {
      throw new Error(
        `IgnorePattern value must be at most ${IgnorePattern.MAX_LENGTH} characters`
      );
    }

    return new IgnorePattern(trimmed);
  }

  /**
   * URLがこのパターンに一致するか判定（substring 部分一致）
   */
  matches(url: string): boolean {
    if (typeof url !== 'string' || url.length === 0) {
      return false;
    }
    return url.includes(this.value);
  }

  /**
   * 等価性チェック
   */
  equals(other: IgnorePattern | undefined | null): boolean {
    if (!other) {
      return false;
    }
    return this.value === other.value;
  }
}
