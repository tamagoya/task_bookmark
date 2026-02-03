/**
 * TestCoverage Value Object
 * テストカバレッジを表す不変オブジェクト
 */
export class TestCoverage {
  private constructor(
    private readonly _moduleName: string,
    private readonly _lineCoverage: number,
    private readonly _branchCoverage: number,
    private readonly _functionCoverage: number,
    private readonly _statementCoverage: number,
    private readonly _timestamp: Date
  ) {
    if (!_moduleName || _moduleName.trim().length === 0) {
      throw new Error('Module name cannot be empty');
    }
    if (_lineCoverage < 0 || _lineCoverage > 100) {
      throw new Error('Line coverage must be between 0 and 100');
    }
    if (_branchCoverage < 0 || _branchCoverage > 100) {
      throw new Error('Branch coverage must be between 0 and 100');
    }
    if (_functionCoverage < 0 || _functionCoverage > 100) {
      throw new Error('Function coverage must be between 0 and 100');
    }
    if (_statementCoverage < 0 || _statementCoverage > 100) {
      throw new Error('Statement coverage must be between 0 and 100');
    }
  }

  /**
   * TestCoverageを作成
   * @param moduleName モジュール名
   * @param lineCoverage 行カバレッジ（%）
   * @param branchCoverage 分岐カバレッジ（%）
   * @param functionCoverage 関数カバレッジ（%）
   * @param statementCoverage ステートメントカバレッジ（%）
   * @param timestamp 計算日時
   * @returns TestCoverageインスタンス
   */
  static create(
    moduleName: string,
    lineCoverage: number,
    branchCoverage: number,
    functionCoverage: number,
    statementCoverage: number,
    timestamp: Date
  ): TestCoverage {
    return new TestCoverage(
      moduleName,
      lineCoverage,
      branchCoverage,
      functionCoverage,
      statementCoverage,
      timestamp
    );
  }

  /**
   * モジュール名を取得
   */
  get moduleName(): string {
    return this._moduleName;
  }

  /**
   * 行カバレッジ（%）を取得
   */
  get lineCoverage(): number {
    return this._lineCoverage;
  }

  /**
   * 分岐カバレッジ（%）を取得
   */
  get branchCoverage(): number {
    return this._branchCoverage;
  }

  /**
   * 関数カバレッジ（%）を取得
   */
  get functionCoverage(): number {
    return this._functionCoverage;
  }

  /**
   * ステートメントカバレッジ（%）を取得
   */
  get statementCoverage(): number {
    return this._statementCoverage;
  }

  /**
   * 計算日時を取得
   */
  get timestamp(): Date {
    return this._timestamp;
  }

  /**
   * 等価性チェック
   * @param other 比較対象のTestCoverage
   * @returns 等しい場合true
   */
  equals(other: TestCoverage): boolean {
    if (!other) {
      return false;
    }
    return (
      this._moduleName === other._moduleName &&
      this._lineCoverage === other._lineCoverage &&
      this._branchCoverage === other._branchCoverage &&
      this._functionCoverage === other._functionCoverage &&
      this._statementCoverage === other._statementCoverage &&
      this._timestamp.getTime() === other._timestamp.getTime()
    );
  }
}
