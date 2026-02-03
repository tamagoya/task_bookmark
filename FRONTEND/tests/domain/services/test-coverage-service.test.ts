import { TestCoverageService } from '../../../src/domain/services/test-coverage-service';
import { TestCoverage } from '../../../src/domain/value-objects/test-coverage';

describe('TestCoverageService', () => {
  let service: TestCoverageService;

  beforeEach(() => {
    service = new TestCoverageService();
  });

  describe('checkCoverageGoal', () => {
    it('should return true when all coverages meet the goal', () => {
      const coverage = TestCoverage.create(
        'test-module',
        85,
        82,
        90,
        88,
        new Date()
      );

      expect(service.checkCoverageGoal(coverage)).toBe(true);
    });

    it('should return false when line coverage is below goal', () => {
      const coverage = TestCoverage.create(
        'test-module',
        75, // < 80%
        85,
        90,
        88,
        new Date()
      );

      expect(service.checkCoverageGoal(coverage)).toBe(false);
    });

    it('should return false when branch coverage is below goal', () => {
      const coverage = TestCoverage.create(
        'test-module',
        85,
        70, // < 80%
        90,
        88,
        new Date()
      );

      expect(service.checkCoverageGoal(coverage)).toBe(false);
    });

    it('should return false when function coverage is below goal', () => {
      const coverage = TestCoverage.create(
        'test-module',
        85,
        82,
        75, // < 80%
        88,
        new Date()
      );

      expect(service.checkCoverageGoal(coverage)).toBe(false);
    });

    it('should return false when statement coverage is below goal', () => {
      const coverage = TestCoverage.create(
        'test-module',
        85,
        82,
        90,
        70, // < 80%
        new Date()
      );

      expect(service.checkCoverageGoal(coverage)).toBe(false);
    });

    it('should return true when all coverages are exactly 80%', () => {
      const coverage = TestCoverage.create(
        'test-module',
        80,
        80,
        80,
        80,
        new Date()
      );

      expect(service.checkCoverageGoal(coverage)).toBe(true);
    });
  });

  describe('createTestCoverageCalculatedEvent', () => {
    it('should create a valid TestCoverageCalculated event', () => {
      const coverage = TestCoverage.create(
        'test-module',
        85,
        82,
        90,
        88,
        new Date()
      );

      const event = service.createTestCoverageCalculatedEvent(coverage);

      expect(event.eventId).toBeDefined();
      expect(event.coverage).toBe(coverage);
      expect(event.calculatedAt).toBeInstanceOf(Date);
    });
  });

  describe('calculateAverageCoverage', () => {
    it('should calculate average of all coverage types', () => {
      const coverage = TestCoverage.create(
        'test-module',
        80,
        70,
        90,
        80,
        new Date()
      );

      const average = service.calculateAverageCoverage(coverage);

      expect(average).toBe(80); // (80 + 70 + 90 + 80) / 4 = 80
    });
  });
});
