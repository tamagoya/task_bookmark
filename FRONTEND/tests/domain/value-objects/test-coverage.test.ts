import { TestCoverage } from '../../../src/domain/value-objects/test-coverage';

describe('TestCoverage', () => {
  describe('create', () => {
    it('should create a valid TestCoverage', () => {
      const coverage = TestCoverage.create(
        'test-module',
        80,
        75,
        85,
        80,
        new Date()
      );

      expect(coverage.moduleName).toBe('test-module');
      expect(coverage.lineCoverage).toBe(80);
      expect(coverage.branchCoverage).toBe(75);
      expect(coverage.functionCoverage).toBe(85);
      expect(coverage.statementCoverage).toBe(80);
      expect(coverage.timestamp).toBeInstanceOf(Date);
    });

    it('should accept coverage of 0', () => {
      const coverage = TestCoverage.create('test-module', 0, 0, 0, 0, new Date());
      expect(coverage.lineCoverage).toBe(0);
    });

    it('should accept coverage of 100', () => {
      const coverage = TestCoverage.create(
        'test-module',
        100,
        100,
        100,
        100,
        new Date()
      );
      expect(coverage.lineCoverage).toBe(100);
    });

    it('should throw error if moduleName is empty', () => {
      expect(() => {
        TestCoverage.create('', 80, 75, 85, 80, new Date());
      }).toThrow('Module name cannot be empty');
    });

    it('should throw error if lineCoverage is negative', () => {
      expect(() => {
        TestCoverage.create('test-module', -1, 75, 85, 80, new Date());
      }).toThrow('Line coverage must be between 0 and 100');
    });

    it('should throw error if lineCoverage is greater than 100', () => {
      expect(() => {
        TestCoverage.create('test-module', 101, 75, 85, 80, new Date());
      }).toThrow('Line coverage must be between 0 and 100');
    });

    it('should throw error if branchCoverage is negative', () => {
      expect(() => {
        TestCoverage.create('test-module', 80, -1, 85, 80, new Date());
      }).toThrow('Branch coverage must be between 0 and 100');
    });

    it('should throw error if functionCoverage is negative', () => {
      expect(() => {
        TestCoverage.create('test-module', 80, 75, -1, 80, new Date());
      }).toThrow('Function coverage must be between 0 and 100');
    });

    it('should throw error if statementCoverage is negative', () => {
      expect(() => {
        TestCoverage.create('test-module', 80, 75, 85, -1, new Date());
      }).toThrow('Statement coverage must be between 0 and 100');
    });
  });

  describe('equals', () => {
    it('should return true for equal TestCoverages', () => {
      const timestamp = new Date();
      const coverage1 = TestCoverage.create(
        'test-module',
        80,
        75,
        85,
        80,
        timestamp
      );
      const coverage2 = TestCoverage.create(
        'test-module',
        80,
        75,
        85,
        80,
        timestamp
      );

      expect(coverage1.equals(coverage2)).toBe(true);
    });

    it('should return false for different TestCoverages', () => {
      const timestamp = new Date();
      const coverage1 = TestCoverage.create(
        'test-module',
        80,
        75,
        85,
        80,
        timestamp
      );
      const coverage2 = TestCoverage.create(
        'test-module',
        90,
        75,
        85,
        80,
        timestamp
      );

      expect(coverage1.equals(coverage2)).toBe(false);
    });
  });
});
