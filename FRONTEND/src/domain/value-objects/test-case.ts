/**
 * TestCase Value Object
 * テストケースを表す不変オブジェクト
 */
export class TestCase {
  private constructor(
    private readonly _testName: string,
    private readonly _testSuite: string,
    private readonly _description: string,
    private readonly _expectedResult: string,
    private readonly _testType: 'unit' | 'integration' | 'e2e'
  ) {
    if (!_testName || _testName.trim().length === 0) {
      throw new Error('Test name cannot be empty');
    }
    if (!_testSuite || _testSuite.trim().length === 0) {
      throw new Error('Test suite cannot be empty');
    }
    if (!_description || _description.trim().length === 0) {
      throw new Error('Description cannot be empty');
    }
  }

  /**
   * TestCaseを作成
   * @param testName テスト名
   * @param testSuite テストスイート名
   * @param description テストの説明
   * @param expectedResult 期待される結果
   * @param testType テストタイプ
   * @returns TestCaseインスタンス
   */
  static create(
    testName: string,
    testSuite: string,
    description: string,
    expectedResult: string,
    testType: 'unit' | 'integration' | 'e2e'
  ): TestCase {
    return new TestCase(testName, testSuite, description, expectedResult, testType);
  }

  /**
   * テスト名を取得
   */
  get testName(): string {
    return this._testName;
  }

  /**
   * テストスイート名を取得
   */
  get testSuite(): string {
    return this._testSuite;
  }

  /**
   * テストの説明を取得
   */
  get description(): string {
    return this._description;
  }

  /**
   * 期待される結果を取得
   */
  get expectedResult(): string {
    return this._expectedResult;
  }

  /**
   * テストタイプを取得
   */
  get testType(): 'unit' | 'integration' | 'e2e' {
    return this._testType;
  }

  /**
   * 等価性チェック
   * @param other 比較対象のTestCase
   * @returns 等しい場合true
   */
  equals(other: TestCase): boolean {
    if (!other) {
      return false;
    }
    return (
      this._testName === other._testName &&
      this._testSuite === other._testSuite &&
      this._description === other._description &&
      this._expectedResult === other._expectedResult &&
      this._testType === other._testType
    );
  }
}
