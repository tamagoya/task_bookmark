/**
 * ErrorMessage Value Object
 * ユーザーフレンドリーなエラーメッセージを表す不変オブジェクト
 */
export class ErrorMessage {
  private constructor(
    private readonly _message: string,
    private readonly _technicalDetails?: string
  ) {
    if (!_message || _message.trim().length === 0) {
      throw new Error('ErrorMessage message cannot be empty');
    }
  }

  /**
   * ErrorMessageを作成
   * @param message ユーザー向けメッセージ（日本語）
   * @param technicalDetails 技術的な詳細（デバッグ用、オプション）
   * @returns ErrorMessageインスタンス
   */
  static create(message: string, technicalDetails?: string): ErrorMessage {
    return new ErrorMessage(message, technicalDetails);
  }

  /**
   * ユーザー向けメッセージを取得
   */
  get message(): string {
    return this._message;
  }

  /**
   * 技術的な詳細を取得
   */
  get technicalDetails(): string | undefined {
    return this._technicalDetails;
  }

  /**
   * ユーザー向けの文字列表現を返す
   * @returns ユーザー向けメッセージ（技術的な詳細は含めない）
   */
  toUserFriendlyString(): string {
    return this._message;
  }

  /**
   * 等価性チェック
   * @param other 比較対象のErrorMessage
   * @returns 等しい場合true
   */
  equals(other: ErrorMessage): boolean {
    if (!other) {
      return false;
    }
    return this._message === other._message;
  }
}
