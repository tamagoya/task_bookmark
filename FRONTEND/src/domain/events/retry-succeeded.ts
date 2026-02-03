import { ErrorOccurred } from './error-occurred';
import { RetryRequested } from './retry-requested';

/**
 * RetrySucceeded Domain Event
 * リトライが成功した時に発行されるイベント
 */
export class RetrySucceeded {
  constructor(
    public readonly eventId: string,
    public readonly originalError: ErrorOccurred,
    public readonly retryRequested: RetryRequested,
    public readonly attempt: number,
    public readonly succeededAt: Date
  ) {}

  /**
   * RetrySucceededを作成
   * @param originalError 元のエラー
   * @param retryRequested リトライ要求イベント
   * @param attempt 成功した試行回数
   * @returns RetrySucceededインスタンス
   */
  static create(
    originalError: ErrorOccurred,
    retryRequested: RetryRequested,
    attempt: number
  ): RetrySucceeded {
    if (attempt < 1) {
      throw new Error('RetrySucceeded attempt must be 1 or greater');
    }
    
    // 一意のイベントIDを生成
    const eventId = `retry-succeeded-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    return new RetrySucceeded(
      eventId,
      originalError,
      retryRequested,
      attempt,
      new Date()
    );
  }
}
