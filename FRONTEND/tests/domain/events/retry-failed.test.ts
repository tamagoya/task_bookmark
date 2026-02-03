import { RetryFailed } from '../../../src/domain/events/retry-failed';
import { ErrorOccurred } from '../../../src/domain/events/error-occurred';
import { RetryRequested } from '../../../src/domain/events/retry-requested';
import { ErrorCode } from '../../../src/domain/value-objects/error-code';
import { ErrorCategory } from '../../../src/domain/value-objects/error-category';
import { ErrorMessage } from '../../../src/domain/value-objects/error-message';
import { ErrorSeverity } from '../../../src/domain/value-objects/error-severity';
import { RetryPolicy } from '../../../src/domain/value-objects/retry-policy';
import { BackoffStrategy } from '../../../src/domain/value-objects/backoff-strategy';

describe('RetryFailed', () => {
  describe('作成', () => {
    it('有効なリトライ失敗情報で作成できる', () => {
      const errorCode = ErrorCode.create('NETWORK_ERROR', ErrorCategory.NETWORK);
      const errorMessage = ErrorMessage.create('ネットワークエラーが発生しました');
      const severity = ErrorSeverity.ERROR;
      const originalError = ErrorOccurred.create(errorCode, errorMessage, severity);
      
      const retryPolicy = RetryPolicy.create(
        3,
        1000,
        BackoffStrategy.EXPONENTIAL,
        [errorCode]
      );
      const retryRequested = RetryRequested.create(originalError, retryPolicy, 1);
      const attempt = 3;
      
      const finalErrorMessage = ErrorMessage.create('リトライが失敗しました');
      const finalError = ErrorOccurred.create(errorCode, finalErrorMessage, severity);
      
      const retryFailed = RetryFailed.create(originalError, retryRequested, attempt, finalError);
      
      expect(retryFailed).toBeDefined();
      expect(retryFailed.originalError).toBe(originalError);
      expect(retryFailed.retryRequested).toBe(retryRequested);
      expect(retryFailed.attempt).toBe(attempt);
      expect(retryFailed.finalError).toBe(finalError);
      expect(retryFailed.eventId).toBeDefined();
      expect(retryFailed.failedAt).toBeInstanceOf(Date);
    });

    it('試行回数が0の場合、エラーを投げる', () => {
      const errorCode = ErrorCode.create('NETWORK_ERROR', ErrorCategory.NETWORK);
      const errorMessage = ErrorMessage.create('ネットワークエラーが発生しました');
      const severity = ErrorSeverity.ERROR;
      const originalError = ErrorOccurred.create(errorCode, errorMessage, severity);
      
      const retryPolicy = RetryPolicy.create(
        3,
        1000,
        BackoffStrategy.EXPONENTIAL,
        [errorCode]
      );
      const retryRequested = RetryRequested.create(originalError, retryPolicy, 1);
      const finalError = ErrorOccurred.create(errorCode, errorMessage, severity);
      
      expect(() => {
        RetryFailed.create(originalError, retryRequested, 0, finalError);
      }).toThrow('RetryFailed attempt must be 1 or greater');
    });
  });
});
