/**
 * ErrorCode Value Object
 * エラーコードを表す不変オブジェクト
 */
export class ErrorCode {
  private constructor(
    private readonly _code: string,
    private readonly _category: string
  ) {
    if (!_code || _code.trim().length === 0) {
      throw new Error('ErrorCode code cannot be empty');
    }
    // 大文字のスネークケース形式をチェック
    if (!/^[A-Z][A-Z0-9_]*$/.test(_code)) {
      throw new Error('ErrorCode code must be in UPPER_SNAKE_CASE format');
    }
  }

  /**
   * ErrorCodeを作成
   * @param code エラーコード（例: "AUTH_FAILED"）
   * @param category エラーのカテゴリ
   * @returns ErrorCodeインスタンス
   */
  static create(code: string, category: string): ErrorCode {
    return new ErrorCode(code, category);
  }

  /**
   * エラーコードを取得
   */
  get code(): string {
    return this._code;
  }

  /**
   * エラーのカテゴリを取得
   */
  get category(): string {
    return this._category;
  }

  /**
   * 等価性チェック
   * @param other 比較対象のErrorCode
   * @returns 等しい場合true
   */
  equals(other: ErrorCode): boolean {
    if (!other) {
      return false;
    }
    return this._code === other._code;
  }
}
