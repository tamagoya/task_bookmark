/**
 * BatchSize Value Object
 * バッチ処理サイズを表す不変オブジェクト
 */
export class BatchSize {
  private constructor(
    private readonly _operationName: string,
    private readonly _size: number,
    private readonly _delayMs: number
  ) {
    if (!_operationName || _operationName.trim().length === 0) {
      throw new Error('Operation name cannot be empty');
    }
    if (_size <= 0) {
      throw new Error('Batch size must be positive');
    }
    if (_delayMs < 0) {
      throw new Error('Delay must be non-negative');
    }
  }

  /**
   * BatchSizeを作成
   * @param operationName 操作名
   * @param size バッチサイズ（一度に処理するアイテム数）
   * @param delayMs バッチ間の遅延時間（ミリ秒）
   * @returns BatchSizeインスタンス
   */
  static create(
    operationName: string,
    size: number,
    delayMs: number
  ): BatchSize {
    return new BatchSize(operationName, size, delayMs);
  }

  /**
   * 操作名を取得
   */
  get operationName(): string {
    return this._operationName;
  }

  /**
   * バッチサイズ（一度に処理するアイテム数）を取得
   */
  get size(): number {
    return this._size;
  }

  /**
   * バッチ間の遅延時間（ミリ秒）を取得
   */
  get delayMs(): number {
    return this._delayMs;
  }

  /**
   * 等価性チェック
   * @param other 比較対象のBatchSize
   * @returns 等しい場合true
   */
  equals(other: BatchSize): boolean {
    if (!other) {
      return false;
    }
    return (
      this._operationName === other._operationName &&
      this._size === other._size &&
      this._delayMs === other._delayMs
    );
  }
}
