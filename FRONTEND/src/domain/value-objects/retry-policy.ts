import { BackoffStrategy } from './backoff-strategy';
import { ErrorCode } from './error-code';
import { ErrorCategory } from './error-category';

/**
 * RetryPolicy Value Object
 * リトライポリシーを表す不変オブジェクト
 */
export class RetryPolicy {
  private constructor(
    private readonly _maxRetries: number,
    private readonly _baseDelayMs: number,
    private readonly _backoffStrategy: string,
    private readonly _retryableErrorCodes: ErrorCode[]
  ) {
    if (_maxRetries < 0) {
      throw new Error('RetryPolicy maxRetries must be 0 or greater');
    }
    if (_baseDelayMs < 0) {
      throw new Error('RetryPolicy baseDelayMs must be 0 or greater');
    }
  }

  /**
   * RetryPolicyを作成
   * @param maxRetries 最大リトライ回数
   * @param baseDelayMs ベース遅延時間（ミリ秒）
   * @param backoffStrategy バックオフ戦略
   * @param retryableErrorCodes リトライ可能なエラーコードのリスト
   * @returns RetryPolicyインスタンス
   */
  static create(
    maxRetries: number,
    baseDelayMs: number,
    backoffStrategy: string,
    retryableErrorCodes: ErrorCode[]
  ): RetryPolicy {
    return new RetryPolicy(maxRetries, baseDelayMs, backoffStrategy, retryableErrorCodes);
  }

  /**
   * デフォルトのリトライポリシーを作成
   * @returns デフォルトのRetryPolicy
   */
  static createDefault(): RetryPolicy {
    const retryableErrorCodes = [
      ErrorCode.create('NETWORK_ERROR', ErrorCategory.NETWORK),
      ErrorCode.create('TIMEOUT', ErrorCategory.NETWORK),
      ErrorCode.create('OFFLINE', ErrorCategory.NETWORK),
      ErrorCode.create('API_ERROR', ErrorCategory.API),
      ErrorCode.create('INVALID_RESPONSE', ErrorCategory.API),
    ];
    
    return RetryPolicy.create(
      3,
      1000,
      BackoffStrategy.EXPONENTIAL,
      retryableErrorCodes
    );
  }

  /**
   * 最大リトライ回数を取得
   */
  get maxRetries(): number {
    return this._maxRetries;
  }

  /**
   * ベース遅延時間を取得
   */
  get baseDelayMs(): number {
    return this._baseDelayMs;
  }

  /**
   * バックオフ戦略を取得
   */
  get backoffStrategy(): string {
    return this._backoffStrategy;
  }

  /**
   * リトライ可能なエラーコードのリストを取得
   */
  get retryableErrorCodes(): ErrorCode[] {
    return [...this._retryableErrorCodes]; // コピーを返す（不変性を保つ）
  }

  /**
   * 指定されたエラーコードがリトライ可能かどうかを判定
   * @param errorCode エラーコード
   * @returns リトライ可能な場合true
   */
  isRetryable(errorCode: ErrorCode): boolean {
    return this._retryableErrorCodes.some(code => code.equals(errorCode));
  }

  /**
   * 指定された試行回数での遅延時間を計算
   * @param attempt 試行回数（0から開始）
   * @returns 遅延時間（ミリ秒）
   */
  calculateDelay(attempt: number): number {
    switch (this._backoffStrategy) {
      case BackoffStrategy.LINEAR:
        return this._baseDelayMs;
      case BackoffStrategy.EXPONENTIAL:
        return this._baseDelayMs * Math.pow(2, attempt);
      case BackoffStrategy.FIXED:
        return this._baseDelayMs;
      default:
        return this._baseDelayMs;
    }
  }

  /**
   * 等価性チェック
   * @param other 比較対象のRetryPolicy
   * @returns 等しい場合true
   */
  equals(other: RetryPolicy): boolean {
    if (!other) {
      return false;
    }
    if (this._maxRetries !== other._maxRetries) {
      return false;
    }
    if (this._baseDelayMs !== other._baseDelayMs) {
      return false;
    }
    if (this._backoffStrategy !== other._backoffStrategy) {
      return false;
    }
    if (this._retryableErrorCodes.length !== other._retryableErrorCodes.length) {
      return false;
    }
    return this._retryableErrorCodes.every((code, index) =>
      code.equals(other._retryableErrorCodes[index])
    );
  }
}
