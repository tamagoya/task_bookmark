/**
 * PerformanceProfile Value Object
 * パフォーマンスプロファイルを表す不変オブジェクト
 */
export class PerformanceProfile {
  private constructor(
    private readonly _operationName: string,
    private readonly _averageExecutionTimeMs: number,
    private readonly _p50ExecutionTimeMs: number,
    private readonly _p95ExecutionTimeMs: number,
    private readonly _p99ExecutionTimeMs: number,
    private readonly _sampleCount: number,
    private readonly _lastUpdated: Date
  ) {
    if (!_operationName || _operationName.trim().length === 0) {
      throw new Error('Operation name cannot be empty');
    }
    if (_averageExecutionTimeMs < 0) {
      throw new Error('Average execution time must be non-negative');
    }
    if (_p50ExecutionTimeMs < 0) {
      throw new Error('P50 execution time must be non-negative');
    }
    if (_p95ExecutionTimeMs < 0) {
      throw new Error('P95 execution time must be non-negative');
    }
    if (_p99ExecutionTimeMs < 0) {
      throw new Error('P99 execution time must be non-negative');
    }
    if (_sampleCount <= 0) {
      throw new Error('Sample count must be positive');
    }
  }

  /**
   * PerformanceProfileを作成
   * @param operationName 操作名
   * @param averageExecutionTimeMs 平均実行時間（ミリ秒）
   * @param p50ExecutionTimeMs 50パーセンタイル実行時間（ミリ秒）
   * @param p95ExecutionTimeMs 95パーセンタイル実行時間（ミリ秒）
   * @param p99ExecutionTimeMs 99パーセンタイル実行時間（ミリ秒）
   * @param sampleCount サンプル数
   * @param lastUpdated 最終更新日時
   * @returns PerformanceProfileインスタンス
   */
  static create(
    operationName: string,
    averageExecutionTimeMs: number,
    p50ExecutionTimeMs: number,
    p95ExecutionTimeMs: number,
    p99ExecutionTimeMs: number,
    sampleCount: number,
    lastUpdated: Date
  ): PerformanceProfile {
    return new PerformanceProfile(
      operationName,
      averageExecutionTimeMs,
      p50ExecutionTimeMs,
      p95ExecutionTimeMs,
      p99ExecutionTimeMs,
      sampleCount,
      lastUpdated
    );
  }

  /**
   * 操作名を取得
   */
  get operationName(): string {
    return this._operationName;
  }

  /**
   * 平均実行時間（ミリ秒）を取得
   */
  get averageExecutionTimeMs(): number {
    return this._averageExecutionTimeMs;
  }

  /**
   * 50パーセンタイル実行時間（ミリ秒）を取得
   */
  get p50ExecutionTimeMs(): number {
    return this._p50ExecutionTimeMs;
  }

  /**
   * 95パーセンタイル実行時間（ミリ秒）を取得
   */
  get p95ExecutionTimeMs(): number {
    return this._p95ExecutionTimeMs;
  }

  /**
   * 99パーセンタイル実行時間（ミリ秒）を取得
   */
  get p99ExecutionTimeMs(): number {
    return this._p99ExecutionTimeMs;
  }

  /**
   * サンプル数を取得
   */
  get sampleCount(): number {
    return this._sampleCount;
  }

  /**
   * 最終更新日時を取得
   */
  get lastUpdated(): Date {
    return this._lastUpdated;
  }

  /**
   * 等価性チェック
   * @param other 比較対象のPerformanceProfile
   * @returns 等しい場合true
   */
  equals(other: PerformanceProfile): boolean {
    if (!other) {
      return false;
    }
    return (
      this._operationName === other._operationName &&
      this._averageExecutionTimeMs === other._averageExecutionTimeMs &&
      this._p50ExecutionTimeMs === other._p50ExecutionTimeMs &&
      this._p95ExecutionTimeMs === other._p95ExecutionTimeMs &&
      this._p99ExecutionTimeMs === other._p99ExecutionTimeMs &&
      this._sampleCount === other._sampleCount &&
      this._lastUpdated.getTime() === other._lastUpdated.getTime()
    );
  }
}
