import { TestCase } from './test-case';

/**
 * TestResult Value Object
 * テスト結果を表す不変オブジェクト
 */
export class TestResult {
  private constructor(
    private readonly _testCase: TestCase,
    private readonly _status: 'passed' | 'failed' | 'skipped',
    private readonly _executionTimeMs: number,
    private readonly _timestamp: Date,
    private readonly _errorMessage?: string
  ) {
    if (_executionTimeMs < 0) {
      throw new Error('Execution time must be non-negative');
    }
    if (_status === 'failed' && !_errorMessage) {
      throw new Error('Error message is required for failed tests');
    }
    if (_status === 'passed' && _errorMessage) {
      throw new Error('Error message must not be provided for passed tests');
    }
  }

  /**
   * TestResultを作成
   * @param testCase テストケース
   * @param status テストステータス
   * @param executionTimeMs 実行時間（ミリ秒）
   * @param timestamp 実行日時
   * @param errorMessage エラーメッセージ（失敗時のみ）
   * @returns TestResultインスタンス
   */
  static create(
    testCase: TestCase,
    status: 'passed' | 'failed' | 'skipped',
    executionTimeMs: number,
    timestamp: Date,
    errorMessage?: string
  ): TestResult {
    return new TestResult(testCase, status, executionTimeMs, timestamp, errorMessage);
  }

  /**
   * テストケースを取得
   */
  get testCase(): TestCase {
    return this._testCase;
  }

  /**
   * テストステータスを取得
   */
  get status(): 'passed' | 'failed' | 'skipped' {
    return this._status;
  }

  /**
   * 実行時間（ミリ秒）を取得
   */
  get executionTimeMs(): number {
    return this._executionTimeMs;
  }

  /**
   * エラーメッセージを取得（失敗時のみ）
   */
  get errorMessage(): string | undefined {
    return this._errorMessage;
  }

  /**
   * 実行日時を取得
   */
  get timestamp(): Date {
    return this._timestamp;
  }

  /**
   * 等価性チェック
   * @param other 比較対象のTestResult
   * @returns 等しい場合true
   */
  equals(other: TestResult): boolean {
    if (!other) {
      return false;
    }
    return (
      this._testCase.equals(other._testCase) &&
      this._status === other._status &&
      this._executionTimeMs === other._executionTimeMs &&
      this._errorMessage === other._errorMessage &&
      this._timestamp.getTime() === other._timestamp.getTime()
    );
  }
}
