/**
 * PerformanceMetric Value Object
 * パフォーマンスメトリクスを表す不変オブジェクト
 */
export class PerformanceMetric {
  private constructor(
    private readonly _operationName: string,
    private readonly _executionTimeMs: number,
    private readonly _memoryUsageMB: number,
    private readonly _cpuUsagePercent: number,
    private readonly _timestamp: Date
  ) {
    if (!_operationName || _operationName.trim().length === 0) {
      throw new Error('Operation name cannot be empty');
    }
    if (_executionTimeMs < 0) {
      throw new Error('Execution time must be non-negative');
    }
    if (_memoryUsageMB < 0) {
      throw new Error('Memory usage must be non-negative');
    }
    if (_cpuUsagePercent < 0 || _cpuUsagePercent > 100) {
      throw new Error('CPU usage must be between 0 and 100');
    }
  }

  /**
   * PerformanceMetricを作成
   * @param operationName 操作名
   * @param executionTimeMs 実行時間（ミリ秒）
   * @param memoryUsageMB メモリ使用量（MB）
   * @param cpuUsagePercent CPU使用率（%）
   * @param timestamp 測定日時
   * @returns PerformanceMetricインスタンス
   */
  static create(
    operationName: string,
    executionTimeMs: number,
    memoryUsageMB: number,
    cpuUsagePercent: number,
    timestamp: Date
  ): PerformanceMetric {
    return new PerformanceMetric(
      operationName,
      executionTimeMs,
      memoryUsageMB,
      cpuUsagePercent,
      timestamp
    );
  }

  /**
   * 操作名を取得
   */
  get operationName(): string {
    return this._operationName;
  }

  /**
   * 実行時間（ミリ秒）を取得
   */
  get executionTimeMs(): number {
    return this._executionTimeMs;
  }

  /**
   * メモリ使用量（MB）を取得
   */
  get memoryUsageMB(): number {
    return this._memoryUsageMB;
  }

  /**
   * CPU使用率（%）を取得
   */
  get cpuUsagePercent(): number {
    return this._cpuUsagePercent;
  }

  /**
   * 測定日時を取得
   */
  get timestamp(): Date {
    return this._timestamp;
  }

  /**
   * 等価性チェック
   * @param other 比較対象のPerformanceMetric
   * @returns 等しい場合true
   */
  equals(other: PerformanceMetric): boolean {
    if (!other) {
      return false;
    }
    return (
      this._operationName === other._operationName &&
      this._executionTimeMs === other._executionTimeMs &&
      this._memoryUsageMB === other._memoryUsageMB &&
      this._cpuUsagePercent === other._cpuUsagePercent &&
      this._timestamp.getTime() === other._timestamp.getTime()
    );
  }
}
