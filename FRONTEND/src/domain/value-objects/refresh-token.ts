/**
 * RefreshToken Value Object
 * リフレッシュトークンを表す不変オブジェクト
 */
export class RefreshToken {
  private constructor(private readonly _value: string) {
    if (!_value || _value.trim().length === 0) {
      throw new Error('RefreshToken value cannot be empty');
    }
    if (_value.length < 10) {
      throw new Error('RefreshToken value must be at least 10 characters');
    }
  }

  /**
   * RefreshTokenを作成
   * @param value トークンの値
   * @returns RefreshTokenインスタンス
   */
  static create(value: string): RefreshToken {
    return new RefreshToken(value);
  }

  /**
   * トークンの値を取得
   */
  get value(): string {
    return this._value;
  }

  /**
   * 等価性チェック
   * @param other 比較対象のRefreshToken
   * @returns 等しい場合true
   */
  equals(other: RefreshToken): boolean {
    if (!other) {
      return false;
    }
    return this._value === other._value;
  }
}
