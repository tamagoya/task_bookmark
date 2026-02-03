import { TestResult } from '../value-objects/test-result';

/**
 * TestExecuted Domain Event
 * テストが実行された時に発行されるイベント
 */
export class TestExecuted {
  constructor(
    public readonly eventId: string,
    public readonly testResult: TestResult,
    public readonly executedAt: Date
  ) {}

  /**
   * TestExecutedを作成
   * @param testResult テスト結果
   * @returns TestExecutedインスタンス
   */
  static create(testResult: TestResult): TestExecuted {
    // 一意のイベントIDを生成（簡易実装: タイムスタンプ + ランダム文字列）
    const eventId = `test-executed-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    return new TestExecuted(eventId, testResult, new Date());
  }
}
