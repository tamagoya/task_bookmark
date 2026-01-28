/**
 * TokenExpiry Value Object
 * トークンの有効期限を表す不変オブジェクト
 */
export class TokenExpiry {
  private constructor(private readonly _expiresAt: Date) {
    const now = new Date();
    if (_expiresAt <= now) {
      throw new Error('TokenExpiry must be in the future');
    }
  }

  /**
   * TokenExpiryを作成
   * @param expiresAt 有効期限の日時
   * @returns TokenExpiryインスタンス
   */
  static create(expiresAt: Date): TokenExpiry {
    return new TokenExpiry(new Date(expiresAt.getTime()));
  }

  /**
   * 有効期限の日時を取得
   */
  get expiresAt(): Date {
    return new Date(this._expiresAt.getTime());
  }

  /**
   * 期限切れかどうかを判定
   * @returns 期限切れの場合true
   */
  isExpired(): boolean {
    const now = new Date();
    return this._expiresAt <= now;
  }

  /**
   * 有効期限までの秒数を取得
   * @returns 秒数
   */
  secondsUntilExpiry(): number {
    const now = new Date();
    const diff = this._expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.floor(diff / 1000));
  }

  /**
   * 等価性チェック
   * @param other 比較対象のTokenExpiry
   * @returns 等しい場合true
   */
  equals(other: TokenExpiry): boolean {
    if (!other) {
      return false;
    }
    return this._expiresAt.getTime() === other._expiresAt.getTime();
  }
}
