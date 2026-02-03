/**
 * PerformanceThreshold Value Object
 * パフォーマンス閾値を表す不変オブジェクト
 */
export class PerformanceThreshold {
  private constructor(
    private readonly _operationName: string,
    private readonly _maxExecutionTimeMs: number,
    private readonly _maxMemoryUsageMB: number,
    private readonly _maxCpuUsagePercent: number
  ) {
    if (!_operationName || _operationName.trim().length === 0) {
      throw new Error('Operation name cannot be empty');
    }
    if (_maxExecutionTimeMs <= 0) {
      throw new Error('Max execution time must be positive');
    }
    if (_maxMemoryUsageMB <= 0) {
      throw new Error('Max memory usage must be positive');
    }
    if (_maxCpuUsagePercent <= 0 || _maxCpuUsagePercent > 100) {
      throw new Error('Max CPU usage must be between 1 and 100');
    }
  }

  /**
   * PerformanceThresholdを作成
   * @param operationName 操作名
   * @param maxExecutionTimeMs 最大実行時間（ミリ秒）
   * @param maxMemoryUsageMB 最大メモリ使用量（MB）
   * @param maxCpuUsagePercent 最大CPU使用率（%）
   * @returns PerformanceThresholdインスタンス
   */
  static create(
    operationName: string,
    maxExecutionTimeMs: number,
    maxMemoryUsageMB: number,
    maxCpuUsagePercent: number
  ): PerformanceThreshold {
    return new PerformanceThreshold(
      operationName,
      maxExecutionTimeMs,
      maxMemoryUsageMB,
      maxCpuUsagePercent
    );
  }

  /**
   * 操作名を取得
   */
  get operationName(): string {
    return this._operationName;
  }

  /**
   * 最大実行時間（ミリ秒）を取得
   */
  get maxExecutionTimeMs(): number {
    return this._maxExecutionTimeMs;
  }

  /**
   * 最大メモリ使用量（MB）を取得
   */
  get maxMemoryUsageMB(): number {
    return this._maxMemoryUsageMB;
  }

  /**
   * 最大CPU使用率（%）を取得
   */
  get maxCpuUsagePercent(): number {
    return this._maxCpuUsagePercent;
  }

  /**
   * 等価性チェック
   * @param other 比較対象のPerformanceThreshold
   * @returns 等しい場合true
   */
  equals(other: PerformanceThreshold): boolean {
    if (!other) {
      return false;
    }
    return (
      this._operationName === other._operationName &&
      this._maxExecutionTimeMs === other._maxExecutionTimeMs &&
      this._maxMemoryUsageMB === other._maxMemoryUsageMB &&
      this._maxCpuUsagePercent === other._maxCpuUsagePercent
    );
  }
}
