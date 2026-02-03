import { BatchSize } from '../../../src/domain/value-objects/batch-size';

describe('BatchSize', () => {
  describe('create', () => {
    it('should create a valid BatchSize', () => {
      const batchSize = BatchSize.create('test-operation', 5, 100);

      expect(batchSize.operationName).toBe('test-operation');
      expect(batchSize.size).toBe(5);
      expect(batchSize.delayMs).toBe(100);
    });

    it('should accept delayMs of 0', () => {
      const batchSize = BatchSize.create('test-operation', 5, 0);
      expect(batchSize.delayMs).toBe(0);
    });

    it('should throw error if operationName is empty', () => {
      expect(() => {
        BatchSize.create('', 5, 100);
      }).toThrow('Operation name cannot be empty');
    });

    it('should throw error if size is not positive', () => {
      expect(() => {
        BatchSize.create('test-operation', 0, 100);
      }).toThrow('Batch size must be positive');
    });

    it('should throw error if delayMs is negative', () => {
      expect(() => {
        BatchSize.create('test-operation', 5, -1);
      }).toThrow('Delay must be non-negative');
    });
  });

  describe('equals', () => {
    it('should return true for equal BatchSizes', () => {
      const batchSize1 = BatchSize.create('test-operation', 5, 100);
      const batchSize2 = BatchSize.create('test-operation', 5, 100);

      expect(batchSize1.equals(batchSize2)).toBe(true);
    });

    it('should return false for different BatchSizes', () => {
      const batchSize1 = BatchSize.create('test-operation', 5, 100);
      const batchSize2 = BatchSize.create('test-operation', 10, 100);

      expect(batchSize1.equals(batchSize2)).toBe(false);
    });
  });
});
