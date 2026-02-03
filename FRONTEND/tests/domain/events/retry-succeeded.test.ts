import { RetrySucceeded } from '../../../src/domain/events/retry-succeeded';
import { ErrorOccurred } from '../../../src/domain/events/error-occurred';
import { RetryRequested } from '../../../src/domain/events/retry-requested';
import { ErrorCode } from '../../../src/domain/value-objects/error-code';
import { ErrorCategory } from '../../../src/domain/value-objects/error-category';
import { ErrorMessage } from '../../../src/domain/value-objects/error-message';
import { ErrorSeverity } from '../../../src/domain/value-objects/error-severity';
import { RetryPolicy } from '../../../src/domain/value-objects/retry-policy';
import { BackoffStrategy } from '../../../src/domain/value-objects/backoff-strategy';

describe('RetrySucceeded', () => {
  describe('作成', () => {
    it('有効なリトライ成功情報で作成できる', () => {
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
      const attempt = 2;
      
      const retrySucceeded = RetrySucceeded.create(originalError, retryRequested, attempt);
      
      expect(retrySucceeded).toBeDefined();
      expect(retrySucceeded.originalError).toBe(originalError);
      expect(retrySucceeded.retryRequested).toBe(retryRequested);
      expect(retrySucceeded.attempt).toBe(attempt);
      expect(retrySucceeded.eventId).toBeDefined();
      expect(retrySucceeded.succeededAt).toBeInstanceOf(Date);
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
      
      expect(() => {
        RetrySucceeded.create(originalError, retryRequested, 0);
      }).toThrow('RetrySucceeded attempt must be 1 or greater');
    });
  });
});
