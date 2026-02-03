import { RetryPolicy } from '../../../src/domain/value-objects/retry-policy';
import { BackoffStrategy } from '../../../src/domain/value-objects/backoff-strategy';
import { ErrorCode } from '../../../src/domain/value-objects/error-code';
import { ErrorCategory } from '../../../src/domain/value-objects/error-category';

describe('RetryPolicy', () => {
  describe('作成', () => {
    it('有効なリトライポリシーで作成できる', () => {
      const maxRetries = 3;
      const baseDelayMs = 1000;
      const backoffStrategy = BackoffStrategy.EXPONENTIAL;
      const retryableErrorCodes = [
        ErrorCode.create('NETWORK_ERROR', ErrorCategory.NETWORK),
        ErrorCode.create('API_ERROR', ErrorCategory.API),
      ];
      
      const retryPolicy = RetryPolicy.create(
        maxRetries,
        baseDelayMs,
        backoffStrategy,
        retryableErrorCodes
      );
      
      expect(retryPolicy).toBeDefined();
      expect(retryPolicy.maxRetries).toBe(maxRetries);
      expect(retryPolicy.baseDelayMs).toBe(baseDelayMs);
      expect(retryPolicy.backoffStrategy).toBe(backoffStrategy);
      expect(retryPolicy.retryableErrorCodes).toEqual(retryableErrorCodes);
    });

    it('負の最大リトライ回数で作成しようとするとエラーを投げる', () => {
      expect(() => {
        RetryPolicy.create(-1, 1000, BackoffStrategy.EXPONENTIAL, []);
      }).toThrow('RetryPolicy maxRetries must be 0 or greater');
    });

    it('負のベース遅延時間で作成しようとするとエラーを投げる', () => {
      expect(() => {
        RetryPolicy.create(3, -1000, BackoffStrategy.EXPONENTIAL, []);
      }).toThrow('RetryPolicy baseDelayMs must be 0 or greater');
    });
  });

  describe('createDefault', () => {
    it('デフォルトのリトライポリシーを作成できる', () => {
      const retryPolicy = RetryPolicy.createDefault();
      
      expect(retryPolicy).toBeDefined();
      expect(retryPolicy.maxRetries).toBe(3);
      expect(retryPolicy.baseDelayMs).toBe(1000);
      expect(retryPolicy.backoffStrategy).toBe(BackoffStrategy.EXPONENTIAL);
      expect(retryPolicy.retryableErrorCodes.length).toBeGreaterThan(0);
    });
  });

  describe('isRetryable', () => {
    it('リトライ可能なエラーコードの場合、trueを返す', () => {
      const networkError = ErrorCode.create('NETWORK_ERROR', ErrorCategory.NETWORK);
      const retryPolicy = RetryPolicy.create(
        3,
        1000,
        BackoffStrategy.EXPONENTIAL,
        [networkError]
      );
      
      expect(retryPolicy.isRetryable(networkError)).toBe(true);
    });

    it('リトライ不可能なエラーコードの場合、falseを返す', () => {
      const authError = ErrorCode.create('AUTH_FAILED', ErrorCategory.AUTHENTICATION);
      const networkError = ErrorCode.create('NETWORK_ERROR', ErrorCategory.NETWORK);
      const retryPolicy = RetryPolicy.create(
        3,
        1000,
        BackoffStrategy.EXPONENTIAL,
        [networkError]
      );
      
      expect(retryPolicy.isRetryable(authError)).toBe(false);
    });
  });

  describe('calculateDelay', () => {
    it('LINEAR戦略の場合、固定間隔を返す', () => {
      const retryPolicy = RetryPolicy.create(
        3,
        1000,
        BackoffStrategy.LINEAR,
        []
      );
      
      expect(retryPolicy.calculateDelay(0)).toBe(1000);
      expect(retryPolicy.calculateDelay(1)).toBe(1000);
      expect(retryPolicy.calculateDelay(2)).toBe(1000);
    });

    it('EXPONENTIAL戦略の場合、指数バックオフを返す', () => {
      const retryPolicy = RetryPolicy.create(
        3,
        1000,
        BackoffStrategy.EXPONENTIAL,
        []
      );
      
      expect(retryPolicy.calculateDelay(0)).toBe(1000); // 2^0 * 1000
      expect(retryPolicy.calculateDelay(1)).toBe(2000); // 2^1 * 1000
      expect(retryPolicy.calculateDelay(2)).toBe(4000); // 2^2 * 1000
    });

    it('FIXED戦略の場合、固定間隔を返す', () => {
      const retryPolicy = RetryPolicy.create(
        3,
        1000,
        BackoffStrategy.FIXED,
        []
      );
      
      expect(retryPolicy.calculateDelay(0)).toBe(1000);
      expect(retryPolicy.calculateDelay(1)).toBe(1000);
      expect(retryPolicy.calculateDelay(2)).toBe(1000);
    });
  });

  describe('等価性', () => {
    it('同じ属性のリトライポリシーは等しい', () => {
      const errorCode = ErrorCode.create('NETWORK_ERROR', ErrorCategory.NETWORK);
      const retryPolicy1 = RetryPolicy.create(
        3,
        1000,
        BackoffStrategy.EXPONENTIAL,
        [errorCode]
      );
      const retryPolicy2 = RetryPolicy.create(
        3,
        1000,
        BackoffStrategy.EXPONENTIAL,
        [errorCode]
      );
      
      expect(retryPolicy1.equals(retryPolicy2)).toBe(true);
    });

    it('異なる属性のリトライポリシーは等しくない', () => {
      const errorCode = ErrorCode.create('NETWORK_ERROR', ErrorCategory.NETWORK);
      const retryPolicy1 = RetryPolicy.create(
        3,
        1000,
        BackoffStrategy.EXPONENTIAL,
        [errorCode]
      );
      const retryPolicy2 = RetryPolicy.create(
        5,
        1000,
        BackoffStrategy.EXPONENTIAL,
        [errorCode]
      );
      
      expect(retryPolicy1.equals(retryPolicy2)).toBe(false);
    });
  });
});
