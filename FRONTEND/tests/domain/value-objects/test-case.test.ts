import { TestCase } from '../../../src/domain/value-objects/test-case';

describe('TestCase', () => {
  describe('create', () => {
    it('should create a valid TestCase with unit type', () => {
      const testCase = TestCase.create(
        'test-name',
        'test-suite',
        'test description',
        'expected result',
        'unit'
      );

      expect(testCase.testName).toBe('test-name');
      expect(testCase.testSuite).toBe('test-suite');
      expect(testCase.description).toBe('test description');
      expect(testCase.expectedResult).toBe('expected result');
      expect(testCase.testType).toBe('unit');
    });

    it('should accept integration test type', () => {
      const testCase = TestCase.create(
        'test-name',
        'test-suite',
        'test description',
        'expected result',
        'integration'
      );
      expect(testCase.testType).toBe('integration');
    });

    it('should accept e2e test type', () => {
      const testCase = TestCase.create(
        'test-name',
        'test-suite',
        'test description',
        'expected result',
        'e2e'
      );
      expect(testCase.testType).toBe('e2e');
    });

    it('should throw error if testName is empty', () => {
      expect(() => {
        TestCase.create('', 'test-suite', 'test description', 'expected result', 'unit');
      }).toThrow('Test name cannot be empty');
    });

    it('should throw error if testSuite is empty', () => {
      expect(() => {
        TestCase.create('test-name', '', 'test description', 'expected result', 'unit');
      }).toThrow('Test suite cannot be empty');
    });

    it('should throw error if description is empty', () => {
      expect(() => {
        TestCase.create('test-name', 'test-suite', '', 'expected result', 'unit');
      }).toThrow('Description cannot be empty');
    });
  });

  describe('equals', () => {
    it('should return true for equal TestCases', () => {
      const testCase1 = TestCase.create(
        'test-name',
        'test-suite',
        'test description',
        'expected result',
        'unit'
      );
      const testCase2 = TestCase.create(
        'test-name',
        'test-suite',
        'test description',
        'expected result',
        'unit'
      );

      expect(testCase1.equals(testCase2)).toBe(true);
    });

    it('should return false for different TestCases', () => {
      const testCase1 = TestCase.create(
        'test-name',
        'test-suite',
        'test description',
        'expected result',
        'unit'
      );
      const testCase2 = TestCase.create(
        'test-name-2',
        'test-suite',
        'test description',
        'expected result',
        'unit'
      );

      expect(testCase1.equals(testCase2)).toBe(false);
    });
  });
});
