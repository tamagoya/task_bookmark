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
    if (error) {
      console.error(`[ERROR] ${message}`, error);
    } else {
      console.error(`[ERROR] ${message}`);
    }
  }

  /**
   * 警告ログを記録
   * @param message メッセージ
   * @param errorOrContext エラーまたはコンテキスト情報（オプション）
   */
  warn(message: string, errorOrContext?: Error | Record<string, unknown>): void {
    if (errorOrContext) {
      console.warn(`[WARN] ${message}`, errorOrContext);
    } else {
      console.warn(`[WARN] ${message}`);
    }
  }

  /**
   * 情報ログを記録
   * @param message メッセージ
   */
  info(message: string): void {
    console.info(`[INFO] ${message}`);
  }

  /**
   * デバッグログを記録
   * @param message メッセージ
   * @param context コンテキスト情報（オプション）
   */
  debug(message: string, context?: Record<string, unknown>): void {
    if (context) {
      console.debug(`[DEBUG] ${message}`, context);
    } else {
      console.debug(`[DEBUG] ${message}`);
    }
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
