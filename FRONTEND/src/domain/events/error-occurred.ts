import { ErrorCode } from '../value-objects/error-code';
import { ErrorMessage } from '../value-objects/error-message';

/**
 * ErrorOccurred Domain Event
 * エラーが発生した時に発行されるイベント
 */
export class ErrorOccurred {
  constructor(
    public readonly eventId: string,
    public readonly errorCode: ErrorCode,
    public readonly errorMessage: ErrorMessage,
    public readonly severity: string,
    public readonly context: Record<string, unknown> | undefined,
    public readonly occurredAt: Date
  ) {}

  /**
   * ErrorOccurredを作成
   * @param errorCode エラーコード
   * @param errorMessage エラーメッセージ
   * @param severity エラーの重要度
   * @param context エラーコンテキスト（オプション）
   * @returns ErrorOccurredインスタンス
   */
  static create(
    errorCode: ErrorCode,
    errorMessage: ErrorMessage,
    severity: string,
    context?: Record<string, unknown>
  ): ErrorOccurred {
    // 一意のイベントIDを生成（簡易実装: タイムスタンプ + ランダム文字列）
    const eventId = `error-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    return new ErrorOccurred(
      eventId,
      errorCode,
      errorMessage,
      severity,
      context,
      new Date()
    );
  }
}
