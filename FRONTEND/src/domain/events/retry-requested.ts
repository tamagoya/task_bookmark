import { ErrorOccurred } from './error-occurred';
import { RetryPolicy } from '../value-objects/retry-policy';

/**
 * RetryRequested Domain Event
 * リトライが要求された時に発行されるイベント
 */
export class RetryRequested {
  constructor(
    public readonly eventId: string,
    public readonly originalError: ErrorOccurred,
    public readonly retryPolicy: RetryPolicy,
    public readonly attempt: number,
    public readonly requestedAt: Date
  ) {}

  /**
   * RetryRequestedを作成
   * @param originalError 元のエラー
   * @param retryPolicy リトライポリシー
   * @param attempt 試行回数（1から開始）
   * @returns RetryRequestedインスタンス
   */
  static create(
    originalError: ErrorOccurred,
    retryPolicy: RetryPolicy,
    attempt: number
  ): RetryRequested {
    if (attempt < 1) {
      throw new Error('RetryRequested attempt must be 1 or greater');
    }
    
    // 一意のイベントIDを生成
    const eventId = `retry-requested-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    return new RetryRequested(
      eventId,
      originalError,
      retryPolicy,
      attempt,
      new Date()
    );
  }
}
