/**
 * AccessToken Value Object
 * アクセストークンを表す不変オブジェクト
 */
export class AccessToken {
  private constructor(private readonly _value: string) {
    if (!_value || _value.trim().length === 0) {
      throw new Error('AccessToken value cannot be empty');
    }
    if (_value.length < 10) {
      throw new Error('AccessToken value must be at least 10 characters');
    }
  }

  /**
   * AccessTokenを作成
   * @param value トークンの値
   * @returns AccessTokenインスタンス
   */
  static create(value: string): AccessToken {
    return new AccessToken(value);
  }

  /**
   * トークンの値を取得
   */
  get value(): string {
    return this._value;
  }

  /**
   * 等価性チェック
   * @param other 比較対象のAccessToken
   * @returns 等しい場合true
   */
  equals(other: AccessToken): boolean {
    if (!other) {
      return false;
    }
    return this._value === other._value;
  }
}
