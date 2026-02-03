import { TestResult } from '../value-objects/test-result';
import { TestExecuted } from '../events/test-executed';

/**
 * TestExecutionService (Domain Service)
 * テスト実行を担当するDomain Service
 * 純粋なビジネスロジックを提供（Repositoryへの依存なし）
 */
export class TestExecutionService {
  /**
   * テスト結果からTestExecutedイベントを作成
   * @param testResult テスト結果
   * @returns TestExecutedイベント
   */
  createTestExecutedEvent(testResult: TestResult): TestExecuted {
    return TestExecuted.create(testResult);
  }

  /**
   * テスト結果が成功かどうかを判定
   * @param testResult テスト結果
   * @returns 成功の場合true
   */
  isTestPassed(testResult: TestResult): boolean {
    return testResult.status === 'passed';
  }

  /**
   * テスト結果が失敗かどうかを判定
   * @param testResult テスト結果
   * @returns 失敗の場合true
   */
  isTestFailed(testResult: TestResult): boolean {
    return testResult.status === 'failed';
  }

  /**
   * テスト結果がスキップされたかどうかを判定
   * @param testResult テスト結果
   * @returns スキップされた場合true
   */
  isTestSkipped(testResult: TestResult): boolean {
    return testResult.status === 'skipped';
  }
}
