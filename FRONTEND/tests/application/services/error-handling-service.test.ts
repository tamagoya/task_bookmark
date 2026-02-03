import { ErrorHandlingService } from '../../../src/application/services/error-handling-service';
import { ErrorCode } from '../../../src/domain/value-objects/error-code';
import { ErrorCategory } from '../../../src/domain/value-objects/error-category';
import { ErrorSeverity } from '../../../src/domain/value-objects/error-severity';
import { RetryPolicy } from '../../../src/domain/value-objects/retry-policy';
import { BackoffStrategy } from '../../../src/domain/value-objects/backoff-strategy';

describe('ErrorHandlingService', () => {
  let errorHandlingService: ErrorHandlingService;

  beforeEach(() => {
    errorHandlingService = new ErrorHandlingService();
  });

  describe('classifyError', () => {
    it('認証エラーを正しく分類する', () => {
      const errorCode = ErrorCode.create('AUTH_FAILED', ErrorCategory.AUTHENTICATION);
      const result = errorHandlingService.classifyError(errorCode);
      
      expect(result.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(result.severity).toBe(ErrorSeverity.ERROR);
    });

    it('ネットワークエラーを正しく分類する', () => {
      const errorCode = ErrorCode.create('NETWORK_ERROR', ErrorCategory.NETWORK);
      const result = errorHandlingService.classifyError(errorCode);
      
      expect(result.category).toBe(ErrorCategory.NETWORK);
      expect(result.severity).toBe(ErrorSeverity.ERROR);
    });

    it('APIエラーを正しく分類する', () => {
      const errorCode = ErrorCode.create('RATE_LIMIT_EXCEEDED', ErrorCategory.API);
      const result = errorHandlingService.classifyError(errorCode);
      
      expect(result.category).toBe(ErrorCategory.API);
      expect(result.severity).toBe(ErrorSeverity.WARNING);
    });

    it('バリデーションエラーを正しく分類する', () => {
      const errorCode = ErrorCode.create('VALIDATION_ERROR', ErrorCategory.VALIDATION);
      const result = errorHandlingService.classifyError(errorCode);
      
      expect(result.category).toBe(ErrorCategory.VALIDATION);
      expect(result.severity).toBe(ErrorSeverity.WARNING);
    });

    it('データエラーを正しく分類する', () => {
      const errorCode = ErrorCode.create('DATA_CORRUPTED', ErrorCategory.DATA);
      const result = errorHandlingService.classifyError(errorCode);
      
      expect(result.category).toBe(ErrorCategory.DATA);
      expect(result.severity).toBe(ErrorSeverity.CRITICAL);
    });
  });

  describe('generateUserMessage', () => {
    it('認証エラーのメッセージを生成する', () => {
      const errorCode = ErrorCode.create('AUTH_FAILED', ErrorCategory.AUTHENTICATION);
      const errorMessage = errorHandlingService.generateUserMessage(errorCode);
      
      expect(errorMessage.message).toContain('認証');
      expect(errorMessage.message).not.toContain('AUTH_FAILED');
    });

    it('ネットワークエラーのメッセージを生成する', () => {
      const errorCode = ErrorCode.create('NETWORK_ERROR', ErrorCategory.NETWORK);
      const errorMessage = errorHandlingService.generateUserMessage(errorCode);
      
      expect(errorMessage.message).toContain('ネットワーク');
    });

    it('コンテキストを含めてメッセージを生成する', () => {
      const errorCode = ErrorCode.create('NETWORK_ERROR', ErrorCategory.NETWORK);
      const context = { operation: '保存' };
      const errorMessage = errorHandlingService.generateUserMessage(errorCode, context);
      
      expect(errorMessage.message).toContain('保存');
    });
  });

  describe('isRetryable', () => {
    it('リトライ可能なエラーコードの場合、trueを返す', () => {
      const errorCode = ErrorCode.create('NETWORK_ERROR', ErrorCategory.NETWORK);
      const retryPolicy = RetryPolicy.create(
        3,
        1000,
        BackoffStrategy.EXPONENTIAL,
        [errorCode]
      );
      
      expect(errorHandlingService.isRetryable(errorCode, retryPolicy)).toBe(true);
    });

    it('リトライ不可能なエラーコードの場合、falseを返す', () => {
      const errorCode = ErrorCode.create('AUTH_FAILED', ErrorCategory.AUTHENTICATION);
      const networkError = ErrorCode.create('NETWORK_ERROR', ErrorCategory.NETWORK);
      const retryPolicy = RetryPolicy.create(
        3,
        1000,
        BackoffStrategy.EXPONENTIAL,
        [networkError]
      );
      
      expect(errorHandlingService.isRetryable(errorCode, retryPolicy)).toBe(false);
    });
  });
});
