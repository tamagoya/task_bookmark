import { ErrorOccurred } from './error-occurred';
import { RetryRequested } from './retry-requested';

/**
 * RetryFailed Domain Event
 * リトライが失敗した時に発行されるイベント
 */
export class RetryFailed {
  constructor(
    public readonly eventId: string,
    public readonly originalError: ErrorOccurred,
    public readonly retryRequested: RetryRequested,
    public readonly attempt: number,
    public readonly finalError: ErrorOccurred,
    public readonly failedAt: Date
  ) {}

  /**
   * RetryFailedを作成
   * @param originalError 元のエラー
   * @param retryRequested リトライ要求イベント
   * @param attempt 失敗した試行回数
   * @param finalError 最終的なエラー
   * @returns RetryFailedインスタンス
   */
  static create(
    originalError: ErrorOccurred,
    retryRequested: RetryRequested,
    attempt: number,
    finalError: ErrorOccurred
  ): RetryFailed {
    if (attempt < 1) {
      throw new Error('RetryFailed attempt must be 1 or greater');
    }
    
    // 一意のイベントIDを生成
    const eventId = `retry-failed-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    return new RetryFailed(
      eventId,
      originalError,
      retryRequested,
      attempt,
      finalError,
      new Date()
    );
  }
}
