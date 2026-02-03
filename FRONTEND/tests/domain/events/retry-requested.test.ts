import { RetryRequested } from '../../../src/domain/events/retry-requested';
import { ErrorOccurred } from '../../../src/domain/events/error-occurred';
import { ErrorCode } from '../../../src/domain/value-objects/error-code';
import { ErrorCategory } from '../../../src/domain/value-objects/error-category';
import { ErrorMessage } from '../../../src/domain/value-objects/error-message';
import { ErrorSeverity } from '../../../src/domain/value-objects/error-severity';
import { RetryPolicy } from '../../../src/domain/value-objects/retry-policy';
import { BackoffStrategy } from '../../../src/domain/value-objects/backoff-strategy';

describe('RetryRequested', () => {
  describe('作成', () => {
    it('有効なリトライ情報で作成できる', () => {
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
      const attempt = 1;
      
      const retryRequested = RetryRequested.create(originalError, retryPolicy, attempt);
      
      expect(retryRequested).toBeDefined();
      expect(retryRequested.originalError).toBe(originalError);
      expect(retryRequested.retryPolicy).toBe(retryPolicy);
      expect(retryRequested.attempt).toBe(attempt);
      expect(retryRequested.eventId).toBeDefined();
      expect(retryRequested.requestedAt).toBeInstanceOf(Date);
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
      
      expect(() => {
        RetryRequested.create(originalError, retryPolicy, 0);
      }).toThrow('RetryRequested attempt must be 1 or greater');
    });
  });
});
