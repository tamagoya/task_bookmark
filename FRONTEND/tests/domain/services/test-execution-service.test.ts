import { TestExecutionService } from '../../../src/domain/services/test-execution-service';
import { TestCase } from '../../../src/domain/value-objects/test-case';
import { TestResult } from '../../../src/domain/value-objects/test-result';

describe('TestExecutionService', () => {
  let service: TestExecutionService;
  const testCase = TestCase.create(
    'test-name',
    'test-suite',
    'test description',
    'expected result',
    'unit'
  );

  beforeEach(() => {
    service = new TestExecutionService();
  });

  describe('createTestExecutedEvent', () => {
    it('should create a valid TestExecuted event', () => {
      const testResult = TestResult.create(testCase, 'passed', 100, new Date());

      const event = service.createTestExecutedEvent(testResult);

      expect(event.eventId).toBeDefined();
      expect(event.testResult).toBe(testResult);
      expect(event.executedAt).toBeInstanceOf(Date);
    });
  });

  describe('isTestPassed', () => {
    it('should return true for passed tests', () => {
      const testResult = TestResult.create(testCase, 'passed', 100, new Date());
      expect(service.isTestPassed(testResult)).toBe(true);
    });

    it('should return false for failed tests', () => {
      const testResult = TestResult.create(testCase, 'failed', 100, new Date(), 'error');
      expect(service.isTestPassed(testResult)).toBe(false);
    });

    it('should return false for skipped tests', () => {
      const testResult = TestResult.create(testCase, 'skipped', 0, new Date());
      expect(service.isTestPassed(testResult)).toBe(false);
    });
  });

  describe('isTestFailed', () => {
    it('should return true for failed tests', () => {
      const testResult = TestResult.create(testCase, 'failed', 100, new Date(), 'error');
      expect(service.isTestFailed(testResult)).toBe(true);
    });

    it('should return false for passed tests', () => {
      const testResult = TestResult.create(testCase, 'passed', 100, new Date());
      expect(service.isTestFailed(testResult)).toBe(false);
    });
  });

  describe('isTestSkipped', () => {
    it('should return true for skipped tests', () => {
      const testResult = TestResult.create(testCase, 'skipped', 0, new Date());
      expect(service.isTestSkipped(testResult)).toBe(true);
    });

    it('should return false for passed tests', () => {
      const testResult = TestResult.create(testCase, 'passed', 100, new Date());
      expect(service.isTestSkipped(testResult)).toBe(false);
    });
  });
});
