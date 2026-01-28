/**
 * RetryHandler
 * ネットワークエラー時のリトライを担当
 */
export class RetryHandler {
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly DEFAULT_BASE_DELAY_MS = 1000;

  /**
   * リトライ付きで操作を実行
   * @param operation 実行する操作
   * @param maxRetries 最大リトライ回数
   * @returns 操作の結果
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.DEFAULT_MAX_RETRIES
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // レート制限エラー（429）の場合は、Retry-Afterヘッダーを確認
        if (this._isRateLimitError(error)) {
          const retryAfter = this._getRetryAfter(error);
          if (retryAfter > 0) {
            await this._delay(retryAfter * 1000);
            continue;
          }
        }

        // 最後の試行でない場合、指数バックオフで待機
        if (attempt < maxRetries) {
          const delay = this._calculateBackoffDelay(attempt);
          await this._delay(delay);
          continue;
        }

        // 最後の試行でも失敗した場合、エラーを投げる
        throw lastError;
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  /**
   * レート制限エラーかどうかを判定
   * @param error エラー
   * @returns レート制限エラーの場合true
   */
  private _isRateLimitError(error: unknown): boolean {
    if (error instanceof Error) {
      return error.message.includes('429') || error.message.includes('rate limit');
    }
    return false;
  }

  /**
   * Retry-Afterヘッダーの値を取得
   * @param error エラー
   * @returns 待機秒数
   */
  private _getRetryAfter(_error: unknown): number {
    // 実際の実装では、エラーレスポンスからRetry-Afterヘッダーを取得
    // ここでは簡易実装として、固定値を返す
    return 60; // 60秒
  }

  /**
   * 指数バックオフの遅延時間を計算
   * @param attempt 試行回数
   * @returns 遅延時間（ミリ秒）
   */
  private _calculateBackoffDelay(attempt: number): number {
    return this.DEFAULT_BASE_DELAY_MS * Math.pow(2, attempt);
  }

  /**
   * 指定時間待機
   * @param ms 待機時間（ミリ秒）
   */
  private _delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
