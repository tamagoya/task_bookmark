import { TestCoverage } from '../value-objects/test-coverage';

/**
 * TestCoverageCalculated Domain Event
 * テストカバレッジが計算された時に発行されるイベント
 */
export class TestCoverageCalculated {
  constructor(
    public readonly eventId: string,
    public readonly coverage: TestCoverage,
    public readonly calculatedAt: Date
  ) {}

  /**
   * TestCoverageCalculatedを作成
   * @param coverage テストカバレッジ
   * @returns TestCoverageCalculatedインスタンス
   */
  static create(coverage: TestCoverage): TestCoverageCalculated {
    // 一意のイベントIDを生成（簡易実装: タイムスタンプ + ランダム文字列）
    const eventId = `test-coverage-calculated-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    return new TestCoverageCalculated(eventId, coverage, new Date());
  }
}
