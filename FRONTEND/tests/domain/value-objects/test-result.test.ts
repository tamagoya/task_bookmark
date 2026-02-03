import { TestResult } from '../../../src/domain/value-objects/test-result';
import { TestCase } from '../../../src/domain/value-objects/test-case';

describe('TestResult', () => {
  const testCase = TestCase.create(
    'test-name',
    'test-suite',
    'test description',
    'expected result',
    'unit'
  );

  describe('create', () => {
    it('should create a valid TestResult with passed status', () => {
      const result = TestResult.create(testCase, 'passed', 100, new Date());

      expect(result.testCase).toBe(testCase);
      expect(result.status).toBe('passed');
      expect(result.executionTimeMs).toBe(100);
      expect(result.errorMessage).toBeUndefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should create a valid TestResult with failed status and error message', () => {
      const result = TestResult.create(
        testCase,
        'failed',
        100,
        new Date(),
        'error message'
      );

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toBe('error message');
    });

    it('should create a valid TestResult with skipped status', () => {
      const result = TestResult.create(testCase, 'skipped', 0, new Date());

      expect(result.status).toBe('skipped');
      expect(result.errorMessage).toBeUndefined();
    });

    it('should throw error if executionTimeMs is negative', () => {
      expect(() => {
        TestResult.create(testCase, 'passed', -1, new Date());
      }).toThrow('Execution time must be non-negative');
    });

    it('should throw error if status is failed but errorMessage is missing', () => {
      expect(() => {
        TestResult.create(testCase, 'failed', 100, new Date());
      }).toThrow('Error message is required for failed tests');
    });

    it('should throw error if status is passed but errorMessage is provided', () => {
      expect(() => {
        TestResult.create(testCase, 'passed', 100, new Date(), 'error message');
      }).toThrow('Error message must not be provided for passed tests');
    });
  });

  describe('equals', () => {
    it('should return true for equal TestResults', () => {
      const timestamp = new Date();
      const result1 = TestResult.create(testCase, 'passed', 100, timestamp);
      const result2 = TestResult.create(testCase, 'passed', 100, timestamp);

      expect(result1.equals(result2)).toBe(true);
    });

    it('should return false for different TestResults', () => {
      const timestamp = new Date();
      const result1 = TestResult.create(testCase, 'passed', 100, timestamp);
      const result2 = TestResult.create(testCase, 'failed', 100, timestamp, 'error');

      expect(result1.equals(result2)).toBe(false);
    });
  });
});
