import { ErrorCode } from '../../../src/domain/value-objects/error-code';
import { ErrorCategory } from '../../../src/domain/value-objects/error-category';

describe('ErrorCode', () => {
  describe('作成', () => {
    it('有効なエラーコードで作成できる', () => {
      const code = 'AUTH_FAILED';
      const category = ErrorCategory.AUTHENTICATION;
      const errorCode = ErrorCode.create(code, category);
      
      expect(errorCode).toBeDefined();
      expect(errorCode.code).toBe(code);
      expect(errorCode.category).toBe(category);
    });

    it('空文字列で作成しようとするとエラーを投げる', () => {
      expect(() => {
        ErrorCode.create('', ErrorCategory.AUTHENTICATION);
      }).toThrow('ErrorCode code cannot be empty');
    });

    it('無効な形式（小文字）で作成しようとするとエラーを投げる', () => {
      expect(() => {
        ErrorCode.create('auth_failed', ErrorCategory.AUTHENTICATION);
      }).toThrow('ErrorCode code must be in UPPER_SNAKE_CASE format');
    });

    it('無効な形式（ハイフン）で作成しようとするとエラーを投げる', () => {
      expect(() => {
        ErrorCode.create('AUTH-FAILED', ErrorCategory.AUTHENTICATION);
      }).toThrow('ErrorCode code must be in UPPER_SNAKE_CASE format');
    });
  });

  describe('等価性', () => {
    it('同じコードのエラーコードは等しい', () => {
      const errorCode1 = ErrorCode.create('AUTH_FAILED', ErrorCategory.AUTHENTICATION);
      const errorCode2 = ErrorCode.create('AUTH_FAILED', ErrorCategory.AUTHENTICATION);
      
      expect(errorCode1.equals(errorCode2)).toBe(true);
    });

    it('異なるコードのエラーコードは等しくない', () => {
      const errorCode1 = ErrorCode.create('AUTH_FAILED', ErrorCategory.AUTHENTICATION);
      const errorCode2 = ErrorCode.create('TOKEN_EXPIRED', ErrorCategory.AUTHENTICATION);
      
      expect(errorCode1.equals(errorCode2)).toBe(false);
    });
  });
});
