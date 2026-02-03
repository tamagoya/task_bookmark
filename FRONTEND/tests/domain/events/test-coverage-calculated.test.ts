import { TestCoverageCalculated } from '../../../src/domain/events/test-coverage-calculated';
import { TestCoverage } from '../../../src/domain/value-objects/test-coverage';

describe('TestCoverageCalculated', () => {
  const coverage = TestCoverage.create('test-module', 80, 75, 85, 80, new Date());

  describe('create', () => {
    it('should create a valid TestCoverageCalculated event', () => {
      const event = TestCoverageCalculated.create(coverage);

      expect(event.eventId).toBeDefined();
      expect(event.coverage).toBe(coverage);
      expect(event.calculatedAt).toBeInstanceOf(Date);
    });

    it('should generate unique event IDs', () => {
      const event1 = TestCoverageCalculated.create(coverage);
      const event2 = TestCoverageCalculated.create(coverage);

      expect(event1.eventId).not.toBe(event2.eventId);
    });
  });
});
