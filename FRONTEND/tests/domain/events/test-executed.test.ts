import { TestExecuted } from '../../../src/domain/events/test-executed';
import { TestResult } from '../../../src/domain/value-objects/test-result';
import { TestCase } from '../../../src/domain/value-objects/test-case';

describe('TestExecuted', () => {
  const testCase = TestCase.create(
    'test-name',
    'test-suite',
    'test description',
    'expected result',
    'unit'
  );
  const testResult = TestResult.create(testCase, 'passed', 100, new Date());

  describe('create', () => {
    it('should create a valid TestExecuted event', () => {
      const event = TestExecuted.create(testResult);

      expect(event.eventId).toBeDefined();
      expect(event.testResult).toBe(testResult);
      expect(event.executedAt).toBeInstanceOf(Date);
    });

    it('should generate unique event IDs', () => {
      const event1 = TestExecuted.create(testResult);
      const event2 = TestExecuted.create(testResult);

      expect(event1.eventId).not.toBe(event2.eventId);
    });
  });
});
