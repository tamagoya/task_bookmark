import { ErrorOccurred } from '../../../src/domain/events/error-occurred';
import { ErrorCode } from '../../../src/domain/value-objects/error-code';
import { ErrorCategory } from '../../../src/domain/value-objects/error-category';
import { ErrorMessage } from '../../../src/domain/value-objects/error-message';
import { ErrorSeverity } from '../../../src/domain/value-objects/error-severity';

describe('ErrorOccurred', () => {
  describe('作成', () => {
    it('有効なエラー情報で作成できる', () => {
      const errorCode = ErrorCode.create('AUTH_FAILED', ErrorCategory.AUTHENTICATION);
      const errorMessage = ErrorMessage.create('認証に失敗しました');
      const severity = ErrorSeverity.ERROR;
      
      const errorOccurred = ErrorOccurred.create(errorCode, errorMessage, severity);
      
      expect(errorOccurred).toBeDefined();
      expect(errorOccurred.errorCode).toBe(errorCode);
      expect(errorOccurred.errorMessage).toBe(errorMessage);
      expect(errorOccurred.severity).toBe(severity);
      expect(errorOccurred.eventId).toBeDefined();
      expect(errorOccurred.occurredAt).toBeInstanceOf(Date);
    });

    it('コンテキストを含めて作成できる', () => {
      const errorCode = ErrorCode.create('NETWORK_ERROR', ErrorCategory.NETWORK);
      const errorMessage = ErrorMessage.create('ネットワークエラーが発生しました');
      const severity = ErrorSeverity.ERROR;
      const context = { operation: '保存', retryCount: 1 };
      
      const errorOccurred = ErrorOccurred.create(errorCode, errorMessage, severity, context);
      
      expect(errorOccurred.context).toEqual(context);
    });
  });

  describe('イベントID', () => {
    it('一意のイベントIDが生成される', () => {
      const errorCode = ErrorCode.create('AUTH_FAILED', ErrorCategory.AUTHENTICATION);
      const errorMessage = ErrorMessage.create('認証に失敗しました');
      const severity = ErrorSeverity.ERROR;
      
      const errorOccurred1 = ErrorOccurred.create(errorCode, errorMessage, severity);
      const errorOccurred2 = ErrorOccurred.create(errorCode, errorMessage, severity);
      
      expect(errorOccurred1.eventId).not.toBe(errorOccurred2.eventId);
    });
  });
});
