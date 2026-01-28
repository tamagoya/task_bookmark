/**
 * Logger
 * ログ記録を担当
 */
export class Logger {
  /**
   * エラーログを記録
   * @param message メッセージ
   * @param error エラー（オプション）
   */
  error(message: string, error?: Error): void {
    console.error(`[ERROR] ${message}`, error);
  }

  /**
   * 警告ログを記録
   * @param message メッセージ
   */
  warn(message: string): void {
    console.warn(`[WARN] ${message}`);
  }

  /**
   * 情報ログを記録
   * @param message メッセージ
   */
  info(message: string): void {
    console.info(`[INFO] ${message}`);
  }

  /**
   * パフォーマンスログを記録
   * @param operation 操作名
   * @param duration 実行時間（ミリ秒）
   */
  performance(operation: string, duration: number): void {
    console.info(`[PERF] ${operation}: ${duration}ms`);
  }
}
