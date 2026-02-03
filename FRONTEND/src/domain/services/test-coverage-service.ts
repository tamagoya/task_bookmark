import { TestCoverage } from '../value-objects/test-coverage';
import { TestCoverageCalculated } from '../events/test-coverage-calculated';

/**
 * TestCoverageService (Domain Service)
 * テストカバレッジ計算を担当するDomain Service
 * 純粋なビジネスロジックを提供（Repositoryへの依存なし）
 */
export class TestCoverageService {
  /**
   * カバレッジ目標を達成しているか確認
   * @param coverage テストカバレッジ
   * @returns 目標を達成している場合true（80%以上）
   */
  checkCoverageGoal(coverage: TestCoverage): boolean {
    const targetCoverage = 80; // NFR要件: 80%以上

    return (
      coverage.lineCoverage >= targetCoverage &&
      coverage.branchCoverage >= targetCoverage &&
      coverage.functionCoverage >= targetCoverage &&
      coverage.statementCoverage >= targetCoverage
    );
  }

  /**
   * テストカバレッジからTestCoverageCalculatedイベントを作成
   * @param coverage テストカバレッジ
   * @returns TestCoverageCalculatedイベント
   */
  createTestCoverageCalculatedEvent(
    coverage: TestCoverage
  ): TestCoverageCalculated {
    return TestCoverageCalculated.create(coverage);
  }

  /**
   * 平均カバレッジを計算
   * @param coverage テストカバレッジ
   * @returns 平均カバレッジ（%）
   */
  calculateAverageCoverage(coverage: TestCoverage): number {
    return (
      (coverage.lineCoverage +
        coverage.branchCoverage +
        coverage.functionCoverage +
        coverage.statementCoverage) /
      4
    );
  }
}
