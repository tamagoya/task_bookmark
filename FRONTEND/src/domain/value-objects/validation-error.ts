/**
 * ValidationError Value Object
 * データ検証エラーを表す不変オブジェクト
 */
export class ValidationError {
  private constructor(
    private readonly _field: string,
    private readonly _errorCode: string,
    private readonly _errorMessage: string,
    private readonly _severity: 'CRITICAL' | 'WARNING' | 'INFO',
    private readonly _recoverable: boolean
  ) {
    if (!_field || _field.trim().length === 0) {
      throw new Error('ValidationError field cannot be empty');
    }
    if (!_errorCode || _errorCode.trim().length === 0) {
      throw new Error('ValidationError errorCode cannot be empty');
    }
    if (!_errorMessage || _errorMessage.trim().length === 0) {
      throw new Error('ValidationError errorMessage cannot be empty');
    }
  }

  /**
   * ValidationErrorを作成
   * @param field エラーが発生したフィールド名
   * @param errorCode エラーコード
   * @param errorMessage エラーメッセージ（ユーザー向け）
   * @param severity エラーの深刻度
   * @param recoverable 部分的に読み込み可能かどうか
   * @returns ValidationErrorインスタンス
   */
  static create(
    field: string,
    errorCode: string,
    errorMessage: string,
    severity: 'CRITICAL' | 'WARNING' | 'INFO',
    recoverable: boolean
  ): ValidationError {
    return new ValidationError(field, errorCode, errorMessage, severity, recoverable);
  }

  /**
   * エラーが発生したフィールド名を取得
   */
  get field(): string {
    return this._field;
  }

  /**
   * エラーコードを取得
   */
  get errorCode(): string {
    return this._errorCode;
  }

  /**
   * エラーメッセージを取得
   */
  get errorMessage(): string {
    return this._errorMessage;
  }

  /**
   * エラーの深刻度を取得
   */
  get severity(): 'CRITICAL' | 'WARNING' | 'INFO' {
    return this._severity;
  }

  /**
   * 部分的に読み込み可能かどうかを取得
   */
  get recoverable(): boolean {
    return this._recoverable;
  }

  /**
   * 等価性チェック
   * @param other 比較対象のValidationError
   * @returns 等しい場合true
   */
  equals(other: ValidationError): boolean {
    if (!other) {
      return false;
    }
    return (
      this._field === other._field &&
      this._errorCode === other._errorCode &&
      this._errorMessage === other._errorMessage &&
      this._severity === other._severity &&
      this._recoverable === other._recoverable
    );
  }
}
